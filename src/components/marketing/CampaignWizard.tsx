import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Send, Calendar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreateCampaign, useSendCampaign } from "@/hooks/useCampaigns";
import { useContactLists } from "@/hooks/useContactLists";
import { supabase } from "@/integrations/supabase/client";
import { validateFullCampaign, normalizePhoneNumber } from "@/lib/validation";
import { MessageTemplate, BulkMessageRequest } from "@/types/campaign";
import { WhatsAppTemplate, getTemplatePreview, isOfficialWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import WizardProgress from "./wizard/WizardProgress";
import StepName from "./wizard/StepName";
import StepTemplate from "./wizard/StepTemplate";
import StepContacts from "./wizard/StepContacts";
import StepReview from "./wizard/StepReview";

interface CampaignWizardProps {
  onCampaignCreated?: () => void;
}

const STEPS = [
  { number: 1, title: "Nome" },
  { number: 2, title: "Template" },
  { number: 3, title: "Contatos" },
  { number: 4, title: "Enviar" },
];

// Helper para extrair dados do imóvel das notes do contato
const parsePropertyFromNotes = (notes: string | null): Record<string, string> => {
  if (!notes) return {};
  
  const result: Record<string, string> = {};
  const parts = notes.split(' | ');
  
  if (parts.length >= 3) {
    const enderecoParts = parts.slice(1).filter(p => !p.startsWith('CEP:') && !p.startsWith('Status:') && !p.startsWith('Valor:'));
    result.endereco = enderecoParts.join(' - ');
  }
  
  const valorMatch = notes.match(/Valor:\s*(R\$\s*[\d.,]+)/);
  if (valorMatch) {
    result.valor = valorMatch[1];
  }
  
  return result;
};

export default function CampaignWizard({ onCampaignCreated }: CampaignWizardProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { data: lists = [] } = useContactLists();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Campaign data
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | WhatsAppTemplate | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [headerMedia, setHeaderMedia] = useState<{
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  } | null>(null);
  const [customTemplateVariables, setCustomTemplateVariables] = useState<Record<string, string>>({});
  
  // Contact selection
  const [selectionMode, setSelectionMode] = useState<'list' | 'individual'>('list');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  
  // Scheduling
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  
  // Validation
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return campaignName.trim().length >= 3;
      case 2:
        return hasValidMessage();
      case 3:
        return selectedContacts.size > 0;
      case 4:
        return validationErrors.length === 0;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < 4) {
      // Validate before moving to step 4
      if (currentStep === 3) {
        await validateCampaign();
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const validateCampaign = async () => {
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('id, phone, name')
      .in('id', Array.from(selectedContacts));

    const errors = validateFullCampaign({
      campaignName,
      template: selectedTemplate,
      customMessage,
      contactIds: Array.from(selectedContacts),
      scheduledAt,
      contactsData: contactsData || []
    });

    if (selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate)) {
      const headerComponent = selectedTemplate.components?.find(c => c.type === 'HEADER');
      const requiresMedia = headerComponent?.format === 'IMAGE' || 
                           headerComponent?.format === 'VIDEO' || 
                           headerComponent?.format === 'DOCUMENT';
      
      if (requiresMedia && (!headerMedia || (!headerMedia.id && !headerMedia.url))) {
        errors.push("O template selecionado requer uma mídia no cabeçalho.");
      }
    }

    setValidationErrors(errors);
    return errors;
  };

  const handleSend = async () => {
    const errors = await validateCampaign();
    
    if (errors.length > 0) {
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
        department_code: "marketing",
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
          .select('id, phone, name, notes')
          .in('id', Array.from(selectedContacts));

        if (contactsError) throw contactsError;

        let templateVariables: string[] = [];
        if (selectedTemplate && isOfficialWhatsAppTemplate(selectedTemplate)) {
          const bodyComponent = selectedTemplate.components?.find(c => c.type === 'BODY');
          if (bodyComponent?.text) {
            const matches = bodyComponent.text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
            templateVariables = matches ? matches.map(v => v.replace(/\{|\}/g, '')) : [];
          }
        }

        const validContacts = (selectedContactObjects || [])
          .filter(contact => contact.phone)
          .map(contact => {
            const variables: Record<string, string> = { ...customTemplateVariables };
            const propertyData = parsePropertyFromNotes(contact.notes);
            
            templateVariables.forEach(varName => {
              if (!variables[varName] || variables[varName] === '') {
                if (varName === 'nome' || varName === 'name') {
                  variables[varName] = contact.name || '[Sem nome]';
                } else if (varName === 'user' || varName === 'usuario') {
                  variables[varName] = profile?.full_name || 'Equipe Smolka';
                } else if (varName === 'endereco') {
                  variables[varName] = propertyData.endereco || '[Endereço não disponível]';
                } else if (varName === 'valor') {
                  variables[varName] = propertyData.valor || '[Valor não disponível]';
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

      toast({
        title: scheduledAt ? "Campanha agendada!" : "Campanha enviada!",
        description: scheduledAt 
          ? `A campanha será enviada no horário agendado.`
          : `Mensagens sendo enviadas para ${selectedContacts.size} contatos.`,
      });

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

  const selectedListName = selectedListId 
    ? lists.find(l => l.id === selectedListId)?.name || null 
    : null;

  const isLoading = createCampaign.isPending || sendCampaign.isPending;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-0">
        {/* Progress Bar */}
        <div className="border-b">
          <WizardProgress currentStep={currentStep} steps={STEPS} />
        </div>

        {/* Step Content */}
        <div className="p-6 min-h-[500px]">
          {currentStep === 1 && (
            <StepName
              name={campaignName}
              description={campaignDescription}
              onNameChange={setCampaignName}
              onDescriptionChange={setCampaignDescription}
            />
          )}

          {currentStep === 2 && (
            <StepTemplate
              selectedTemplate={selectedTemplate}
              customMessage={customMessage}
              headerMedia={headerMedia}
              customTemplateVariables={customTemplateVariables}
              onTemplateSelect={setSelectedTemplate}
              onCustomMessageChange={setCustomMessage}
              onHeaderMediaChange={setHeaderMedia}
              onCustomTemplateVariablesChange={setCustomTemplateVariables}
            />
          )}

          {currentStep === 3 && (
            <StepContacts
              selectedListId={selectedListId}
              selectedContacts={selectedContacts}
              selectionMode={selectionMode}
              onSelectionModeChange={setSelectionMode}
              onListSelect={setSelectedListId}
              onContactsChange={setSelectedContacts}
            />
          )}

          {currentStep === 4 && (
            <StepReview
              campaignName={campaignName}
              campaignDescription={campaignDescription}
              selectedTemplate={selectedTemplate}
              customMessage={customMessage}
              selectedContacts={selectedContacts}
              selectedListName={selectedListName}
              scheduledAt={scheduledAt}
              onScheduledAtChange={setScheduledAt}
              validationErrors={validationErrors}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="border-t p-4 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isLoading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Passo {currentStep} de {STEPS.length}
          </div>

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed(currentStep) || isLoading}
            >
              Próximo
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!canProceed(4) || isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {scheduledAt ? 'Agendando...' : 'Enviando...'}
                </>
              ) : (
                <>
                  {scheduledAt ? <Calendar className="h-4 w-4 mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {scheduledAt ? 'Agendar Campanha' : 'Enviar Agora'}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
