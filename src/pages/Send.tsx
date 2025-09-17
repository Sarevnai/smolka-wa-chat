import { useState } from "react";
import { Megaphone, Plus, History, BarChart3, Calendar, Send as SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import TemplateSelector from "@/components/campaigns/TemplateSelector";
import ContactSelector from "@/components/campaigns/ContactSelector";
import CampaignScheduler from "@/components/campaigns/CampaignScheduler";
import CampaignPreview from "@/components/campaigns/CampaignPreview";
import { useCampaigns, useCreateCampaign, useSendCampaign } from "@/hooks/useCampaigns";
import { useTemplates } from "@/hooks/useTemplates";
import { Campaign, MessageTemplate, BulkMessageRequest } from "@/types/campaign";
import { WhatsAppTemplate, getTemplatePreview } from "@/hooks/useWhatsAppTemplates";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function Send() {
  const { profile } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | WhatsAppTemplate | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState("create");
  
  const { toast } = useToast();
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();

  const isAdmin = profile?.role === 'admin';

  const getMessage = () => {
    if (selectedTemplate) {
      // Check if it's a WhatsApp template or regular template
      if ('template_name' in selectedTemplate && 'components' in selectedTemplate) {
        // WhatsApp template - use the preview function
        const preview = getTemplatePreview(selectedTemplate);
        console.log('WhatsApp template preview:', preview);
        // More robust fallback: use template_name if preview is empty, or default message
        return preview && preview.trim() ? preview : 
               selectedTemplate.template_name || 
               'Template WhatsApp selecionado';
      } else if ('content' in selectedTemplate) {
        // Regular template
        console.log('Regular template content:', selectedTemplate.content);
        return selectedTemplate.content || '';
      }
    }
    console.log('Custom message:', customMessage);
    return customMessage || '';
  };

  // Helper function to check if we have valid message content
  const hasValidMessage = () => {
    const message = getMessage();
    const isValid = message && message.trim().length > 0;
    console.log('Debug - hasValidMessage:', {
      selectedTemplate: selectedTemplate ? {
        type: 'template_name' in selectedTemplate ? 'whatsapp' : 'regular',
        name: 'template_name' in selectedTemplate ? selectedTemplate.template_name : selectedTemplate.name
      } : null,
      customMessage: customMessage,
      message: message,
      isValid: isValid
    });
    return isValid;
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, defina um nome para a campanha.",
        variant: "destructive",
      });
      return;
    }

    if (selectedContacts.size === 0) {
      toast({
        title: "Contatos obrigatórios",
        description: "Selecione pelo menos um contato.",
        variant: "destructive",
      });
      return;
    }

    const message = getMessage();
    if (!message.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Defina uma mensagem ou selecione um template.",
        variant: "destructive",
      });
      return;
    }

    try {
      const campaign = await createCampaign.mutateAsync({
        name: campaignName,
        message,
        template_id: selectedTemplate?.id,
        target_contacts: Array.from(selectedContacts),
        scheduled_at: scheduledAt?.toISOString(),
        status: scheduledAt ? "scheduled" : "draft",
      });

      if (!scheduledAt) {
        // Send immediately - fetch selected contacts directly from database
        const { data: selectedContactObjects, error: contactsError } = await supabase
          .from('contacts')
          .select('id, phone, name')
          .in('id', Array.from(selectedContacts));

        if (contactsError) {
          throw contactsError;
        }

        const bulkRequest: BulkMessageRequest = {
          contacts: selectedContactObjects.map(contact => ({
            phone: contact.phone,
            name: contact.name || undefined,
          })),
          message,
          template_id: selectedTemplate?.id,
          campaign_id: campaign.id,
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
      setActiveTab("history");
      
    } catch (error) {
      console.error("Error creating campaign:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviada';
      case 'scheduled': return 'Agendada';
      case 'sending': return 'Enviando';
      case 'draft': return 'Rascunho';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta funcionalidade.
              <br />
              Entre em contato com um administrador.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Campanhas
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie campanhas de mensagens em massa para seus contatos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Campanha
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          {/* Create Campaign Tab */}
          <TabsContent value="create" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Campaign Name */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Detalhes da Campanha</CardTitle>
                    <CardDescription>
                      Defina o nome e configurações básicas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Nome da Campanha</label>
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => setCampaignName(e.target.value)}
                          placeholder="Ex: Cobrança Janeiro 2024"
                          className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Template Selector */}
                <TemplateSelector
                  selectedTemplate={selectedTemplate}
                  onTemplateSelect={(template) => setSelectedTemplate(template as MessageTemplate | WhatsAppTemplate | null)}
                />

                {/* Custom Message for non-template campaigns */}
                {!selectedTemplate && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Mensagem Personalizada</CardTitle>
                      <CardDescription>
                        Escreva sua própria mensagem
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-24 resize-none"
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
                      onClick={handleCreateCampaign}
                      disabled={createCampaign.isPending || sendCampaign.isPending || !campaignName.trim() || selectedContacts.size === 0 || !hasValidMessage()}
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
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Campanhas
                </CardTitle>
                <CardDescription>
                  Visualize todas as campanhas enviadas e seus resultados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando campanhas...
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {getStatusLabel(campaign.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {campaign.message}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Contatos:</span>
                            <p className="font-medium">{campaign.target_contacts.length}</p>
                          </div>
                          
                          {campaign.sent_count !== undefined && (
                            <div>
                              <span className="text-muted-foreground">Enviadas:</span>
                              <p className="font-medium text-green-600">{campaign.sent_count}</p>
                            </div>
                          )}
                          
                          {campaign.failed_count !== undefined && campaign.failed_count > 0 && (
                            <div>
                              <span className="text-muted-foreground">Falharam:</span>
                              <p className="font-medium text-red-600">{campaign.failed_count}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-muted-foreground">
                              {campaign.scheduled_at ? 'Agendada:' : 'Criada:'}
                            </span>
                            <p className="font-medium">
                              {new Date(campaign.scheduled_at || campaign.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total de Campanhas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{campaigns.length}</div>
                  <p className="text-xs text-muted-foreground">Campanhas criadas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Campanhas Ativas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {campaigns.filter(c => c.status === 'scheduled' || c.status === 'sending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Agendadas ou enviando</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mensagens Enviadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {campaigns.reduce((total, campaign) => total + (campaign.sent_count || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total de mensagens</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Campanhas por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['draft', 'scheduled', 'sending', 'sent', 'cancelled'].map((status) => {
                    const count = campaigns.filter(c => c.status === status).length;
                    const percentage = campaigns.length > 0 ? (count / campaigns.length) * 100 : 0;
                    
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)} variant="outline">
                            {getStatusLabel(status)}
                          </Badge>
                          <span className="text-sm">{count} campanhas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}