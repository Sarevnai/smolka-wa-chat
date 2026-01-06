import { useState } from "react";
import { Calendar, Send as SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import TemplateSelector from "@/components/campaigns/TemplateSelector";
import ContactSelector from "@/components/campaigns/ContactSelector";
import CampaignScheduler from "@/components/campaigns/CampaignScheduler";
import CampaignPreview from "@/components/campaigns/CampaignPreview";
import SendConfirmationModal from "@/components/campaigns/SendConfirmationModal";
import { HeaderMediaSelector } from "@/components/campaigns/HeaderMediaSelector";
import { TemplateVariablesForm } from "@/components/campaigns/TemplateVariablesForm";
import { useCreateCampaign, useSendCampaign } from "@/hooks/useCampaigns";
import { MessageTemplate, BulkMessageRequest } from "@/types/campaign";
import { WhatsAppTemplate, getTemplatePreview, isOfficialWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { validateFullCampaign, normalizePhoneNumber } from "@/lib/validation";

interface CampaignCreatorProps {
  onCampaignCreated?: () => void;
  compact?: boolean;
}

export default function CampaignCreator({ onCampaignCreated, compact = false }: CampaignCreatorProps) {
  const { profile } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | WhatsAppTemplate | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [headerMedia, setHeaderMedia] = useState<{
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  } | null>(null);
  const [customTemplateVariables, setCustomTemplateVariables] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  const getMessage = () => {
    if (selectedTemplate) {
      if (isOfficialWhatsAppTemplate(selectedTemplate)) {
        const preview = getTemplatePreview(selectedTemplate);
        return preview || selectedTemplate.template_name || 'Template WhatsApp';
      } else if ('content' in selectedTemplate) {
        return selectedTemplate.content || '';
      }
    }
    return customMessage || '';
  };

  const hasValidMessage = () => {
    if (selectedTemplate) {
      if (isOfficialWhatsAppTemplate(selectedTemplate)) {
        const preview = getTemplatePreview(selectedTemplate);
        return preview && preview.trim().length > 0 && selectedTemplate.status === 'active';
      } else if ('content' in selectedTemplate) {
        return selectedTemplate.content && selectedTemplate.content.trim().length > 0;
      }
    }
    return customMessage && customMessage.trim().length > 0;
  };

  const handlePrepareCampaign = async () => {
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('id, phone, name')
      .in('id', Array.from(selectedContacts));

    if (contactsError) {
      toast({
        title: "Erro ao validar contatos",
        description: contactsError.message,
        variant: "destructive",
      });
      return;
    }

    const errors = validateFullCampaign({
      campaignName,
      template: selectedTemplate,
      customMessage,
      contactIds: Array.from(selectedContacts),
      scheduledAt,
      contactsData
    });

    if (selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate)) {
      const headerComponent = selectedTemplate.components?.find(c => c.type === 'HEADER');
      const requiresMedia = headerComponent?.format === 'IMAGE' || 
                           headerComponent?.format === 'VIDEO' || 
                           headerComponent?.format === 'DOCUMENT';
      
      if (requiresMedia && (!headerMedia || (!headerMedia.id && !headerMedia.url))) {
        errors.push("O template selecionado requer uma mídia no cabeçalho. Faça upload ou forneça uma URL pública.");
      }
    }

    setValidationErrors(errors);

    if (errors.length > 0) {
      toast({
        title: "Corrija os erros antes de continuar",
        description: errors.slice(0, 2).join("; "),
        variant: "destructive",
      });
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Existem erros na campanha",
        description: "Corrija todos os erros antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const message = getMessage();
      
      const templateId = selectedTemplate && !isOfficialWhatsAppTemplate(selectedTemplate) 
        ? selectedTemplate.id 
        : null;

      const campaignData: any = {
        name: campaignName,
        message,
        template_id: templateId,
        target_contacts: Array.from(selectedContacts),
        scheduled_at: scheduledAt?.toISOString(),
        status: scheduledAt ? "scheduled" : "draft",
      };

      if (selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate)) {
        campaignData.wa_template_id = selectedTemplate.template_id;
        
        if (headerMedia) {
          campaignData.header_media_id = headerMedia.id;
          campaignData.header_media_url = headerMedia.url;
          campaignData.header_media_type = headerMedia.type;
          campaignData.header_media_mime = headerMedia.mime;
        }
      }

      const campaign = await createCampaign.mutateAsync(campaignData);

      if (!scheduledAt) {
        const { data: selectedContactObjects, error: contactsError } = await supabase
          .from('contacts')
          .select('id, phone, name')
          .in('id', Array.from(selectedContacts));

        if (contactsError) {
          throw contactsError;
        }

        let templateVariables: string[] = [];
        if (selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate)) {
          const bodyComponent = selectedTemplate.components?.find(c => c.type === 'BODY');
          if (bodyComponent?.text) {
            const matches = bodyComponent.text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
            templateVariables = matches ? matches.map(v => v.replace(/\{|\}/g, '')) : [];
          }
        }

        const validContacts = selectedContactObjects
          .filter(contact => contact.phone)
          .map(contact => {
            const variables: Record<string, string> = { ...customTemplateVariables };
            
            templateVariables.forEach(varName => {
              if (!variables[varName] || variables[varName] === '') {
                if (varName === 'nome' || varName === 'name') {
                  variables[varName] = contact.name || '[Sem nome]';
                } else if (varName === 'user' || varName === 'usuario') {
                  variables[varName] = profile?.full_name || 'Equipe Smolka';
                }
              }
            });

            return {
              phone: normalizePhoneNumber(contact.phone),
              name: contact.name || undefined,
              variables
            };
          });

        const bulkRequest: BulkMessageRequest = {
          contacts: validContacts,
          message,
          template_id: selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate) 
            ? selectedTemplate.template_id
            : undefined,
          campaign_id: campaign.id,
          header_media: headerMedia || undefined,
        };

        await sendCampaign.mutateAsync({
          campaignId: campaign.id,
          request: bulkRequest,
        });
      }

      // Reset form
      setCampaignName("");
      setCustomMessage("");
      setSelectedTemplate(null);
      setSelectedContacts(new Set());
      setScheduledAt(null);
      setValidationErrors([]);
      setHeaderMedia(null);
      setCustomTemplateVariables({});
      setShowConfirmModal(false);
      
      onCampaignCreated?.();
      
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Erro ao enviar campanha",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const isSubmitDisabled = createCampaign.isPending || sendCampaign.isPending || !campaignName.trim() || selectedContacts.size === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Campaign Name */}
          <Card>
            <CardHeader className={compact ? "pb-3" : undefined}>
              <CardTitle className="text-lg">Detalhes da Campanha</CardTitle>
              {!compact && (
                <CardDescription>
                  Defina o nome e configurações básicas
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nome da Campanha</label>
                  <Input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex: Cobrança Janeiro 2024"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Selector */}
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateSelect={(template) => {
              setSelectedTemplate(template as MessageTemplate | WhatsAppTemplate | null);
              setHeaderMedia(null);
              setCustomTemplateVariables({});
            }}
          />

          {/* Header Media Selector for WhatsApp templates with media headers */}
          {selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate) && (() => {
            const headerComponent = selectedTemplate.components?.find(c => c.type === 'HEADER');
            const mediaType = headerComponent?.format === 'IMAGE' ? 'image' 
              : headerComponent?.format === 'VIDEO' ? 'video'
              : headerComponent?.format === 'DOCUMENT' ? 'document' : null;
            
            return mediaType ? (
              <HeaderMediaSelector
                mediaType={mediaType}
                onMediaSelect={setHeaderMedia}
                selectedMedia={headerMedia}
              />
            ) : null;
          })()}

          {/* Template Variables Form for WhatsApp templates */}
          {selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate) && (() => {
            const bodyComponent = selectedTemplate.components?.find(c => c.type === 'BODY');
            const templateText = bodyComponent?.text || '';
            
            return templateText ? (
              <TemplateVariablesForm
                templateText={templateText}
                onVariablesChange={setCustomTemplateVariables}
                defaultValues={customTemplateVariables}
              />
            ) : null;
          })()}

          {/* Custom Message for non-template campaigns */}
          {!selectedTemplate && (
            <Card>
              <CardHeader className={compact ? "pb-3" : undefined}>
                <CardTitle className="text-lg">Mensagem Personalizada</CardTitle>
                {!compact && (
                  <CardDescription>
                    Escreva sua própria mensagem
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="min-h-24 resize-none"
                />
                <div className="text-xs text-muted-foreground mt-2">
                  {customMessage.length}/1000 caracteres
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scheduler */}
          <CampaignScheduler
            onSchedule={setScheduledAt}
            onSendNow={() => {}}
          />
        </div>

        <div className="space-y-6">
          {/* Contact Selector */}
          <ContactSelector
            selectedContacts={selectedContacts}
            onContactsChange={setSelectedContacts}
          />

          {/* Campaign Preview */}
          <CampaignPreview
            message={getMessage()}
            template={selectedTemplate}
            selectedContacts={Array.from(selectedContacts)}
            scheduledAt={scheduledAt}
            campaignName={campaignName}
          />

          {/* Send Button */}
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handlePrepareCampaign}
                disabled={isSubmitDisabled}
                className="w-full"
                size="lg"
              >
                {createCampaign.isPending || sendCampaign.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {scheduledAt ? 'Agendando...' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    {scheduledAt ? <Calendar className="h-4 w-4 mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
                    {scheduledAt ? 'Agendar Campanha' : 'Enviar Agora'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Send Confirmation Modal */}
          <SendConfirmationModal
            open={showConfirmModal}
            onOpenChange={setShowConfirmModal}
            onConfirm={handleConfirmSend}
            isLoading={createCampaign.isPending || sendCampaign.isPending}
            campaignName={campaignName}
            message={getMessage()}
            template={selectedTemplate}
            selectedContacts={Array.from(selectedContacts)}
            scheduledAt={scheduledAt}
            validationErrors={validationErrors}
          />
        </div>
      </div>
    </div>
  );
}
