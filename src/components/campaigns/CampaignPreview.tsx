import { Eye, MessageSquare, Users, Calendar, Send, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageTemplate } from "@/types/campaign";
import { WhatsAppTemplate, getTemplatePreview, isOfficialWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignPreviewProps {
  message: string;
  template?: MessageTemplate | WhatsAppTemplate;
  selectedContacts: string[];
  scheduledAt?: Date | null;
  campaignName?: string;
}

export default function CampaignPreview({ 
  message, 
  template, 
  selectedContacts, 
  scheduledAt,
  campaignName 
}: CampaignPreviewProps) {
  const selectedContactsCount = selectedContacts.length;
  
  const replaceVariables = (content: string) => {
    if (!template) return content;
    
    if (isOfficialWhatsAppTemplate(template)) {
      return getTemplatePreview(template);
    }
    
    let result = content;
    const variableMap: Record<string, string> = {
      nome: "João Silva", // Sample data for preview
      contrato: "12345",
      propriedade: "PROP-001", 
      tipo_contrato: "Aluguel",
      status_contrato: "ativo",
      telefone: "11999999999",
      email: "joao@email.com",
      data: format(new Date(), "dd/MM/yyyy"),
      horario: format(new Date(), "HH:mm"),
      mensagem: "informação importante"
    };

    template.variables?.forEach(variable => {
      const placeholder = `{{${variable}}}`;
      const value = variableMap[variable] || `[${variable}]`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    
    return result;
  };

  const previewMessage = template ? replaceVariables(message) : message;
  const messageLength = previewMessage.length;
  const estimatedCost = selectedContactsCount * 0.05; // Estimativa R$ 0,05 por mensagem

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Prévia da Campanha
        </CardTitle>
        <CardDescription>
          Visualize como sua campanha será enviada
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Campaign Summary */}
        <div className="space-y-3">
          {campaignName && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Nome da Campanha:</p>
              <p className="font-medium">{campaignName}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-md">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{selectedContactsCount}</p>
              <p className="text-xs text-muted-foreground">Destinatários</p>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-md">
              <MessageSquare className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{messageLength}</p>
              <p className="text-xs text-muted-foreground">Caracteres</p>
            </div>
            
            {scheduledAt ? (
              <div className="text-center p-3 bg-muted rounded-md">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-orange-500" />
                <p className="text-sm font-bold">Agendado</p>
                <p className="text-xs text-muted-foreground">
                  {format(scheduledAt, "dd/MM HH:mm")}
                </p>
              </div>
            ) : (
              <div className="text-center p-3 bg-muted rounded-md">
                <Send className="h-5 w-5 mx-auto mb-1 text-green-500" />
                <p className="text-sm font-bold">Imediato</p>
                <p className="text-xs text-muted-foreground">Enviar agora</p>
              </div>
            )}
            
            <div className="text-center p-3 bg-muted rounded-md">
              <p className="text-lg font-bold text-green-600">
                R$ {estimatedCost.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Custo estimado</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Template Info */}
        {template && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-medium">Template Selecionado:</p>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {isOfficialWhatsAppTemplate(template) ? template.template_name : template.name}
                </Badge>
                {isOfficialWhatsAppTemplate(template) && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    WhatsApp Oficial
                  </Badge>
                )}
              </div>
            </div>
            
            {isOfficialWhatsAppTemplate(template) ? (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-sm font-medium text-green-800">Template Aprovado pela Meta</p>
                </div>
                <p className="text-xs text-green-700">
                  Este template foi aprovado pela Meta e pode ser usado para mensagens proativas.
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Categoria: {template.category} | Status: {template.status}
                </p>
              </div>
            ) : (
              template.variables?.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Variáveis que serão substituídas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map(variable => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Message Preview */}
        <div>
          <p className="font-medium mb-3">Prévia da Mensagem:</p>
          <div className="relative">
            {/* WhatsApp-like message bubble */}
            <div className="bg-green-100 border border-green-200 rounded-lg p-4 max-w-sm ml-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">ADM</span>
                </div>
                <div>
                  <p className="text-xs font-medium">ADM Locação</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(), "HH:mm")}
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded p-3 shadow-sm">
                <p className="text-sm whitespace-pre-wrap">{previewMessage}</p>
              </div>
            </div>
            
            {/* Sample recipient info */}
            <div className="mt-3 p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">
                Preview com dados de exemplo para {selectedContactsCount} contato{selectedContactsCount !== 1 ? 's' : ''}
              </p>
              {template && !isOfficialWhatsAppTemplate(template) && template.variables?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  As variáveis serão substituídas automaticamente para cada contato
                </p>
              )}
              {isOfficialWhatsAppTemplate(template) && (
                <p className="text-xs text-muted-foreground">
                  Template oficial do WhatsApp com parâmetros pré-definidos
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Character limit warning */}
        {messageLength > 1000 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              ⚠️ Mensagem muito longa ({messageLength} caracteres). 
              Considere reduzir para melhor entrega.
            </p>
          </div>
        )}

        {/* Target audience preview */}
        {selectedContactsCount > 0 && (
          <div>
            <p className="font-medium mb-3">Resumo dos Destinatários:</p>
            <div className="p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  <strong>{selectedContactsCount}</strong> contatos selecionados receberão esta campanha
                </p>
                <Badge variant="outline" className="text-xs">
                  Estimativa: {Math.ceil(selectedContactsCount * 2)}s para envio completo
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Warnings */}
        {selectedContactsCount === 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Nenhum contato selecionado. Selecione pelo menos um contato para enviar a campanha.
              </p>
            </div>
          </div>
        )}

        {!message && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                Mensagem vazia. {template ? 'Selecione um template' : 'Digite uma mensagem'} antes de enviar.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}