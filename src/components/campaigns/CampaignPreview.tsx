import { Eye, MessageSquare, Users, Calendar, Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MessageTemplate } from "@/types/campaign";
import { Contact } from "@/types/contact";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CampaignPreviewProps {
  message: string;
  template?: MessageTemplate;
  selectedContacts: Contact[];
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
  const sampleContact = selectedContacts?.[0];
  
  const replaceVariables = (content: string) => {
    if (!template) return content;
    
    let result = content;
    const variableMap: Record<string, string> = {
      nome: sampleContact?.name || "Cliente",
      contrato: sampleContact?.contracts?.[0]?.contract_number || "12345",
      valor: "1.200,00",
      endereco: "Rua das Flores, 123",
      data: format(new Date(), "dd/MM/yyyy"),
      horario: "14:00",
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
  const estimatedCost = selectedContacts.length * 0.05; // Estimativa R$ 0,05 por mensagem

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
              <p className="text-2xl font-bold">{selectedContacts.length}</p>
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
              <Badge variant="outline">{template.name}</Badge>
            </div>
            
            {template && template.variables?.length > 0 && (
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
            {sampleContact && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs text-muted-foreground mb-1">
                  Exemplo com dados de: <strong>{sampleContact.name || sampleContact.phone}</strong>
                </p>
                {sampleContact && template && template.variables?.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    As variáveis serão substituídas automaticamente para cada contato
                  </p>
                )}
              </div>
            )}
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
        {selectedContacts.length > 0 && (
          <div>
            <p className="font-medium mb-3">Destinatários ({selectedContacts.length}):</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedContacts.slice(0, 5).map(contact => (
                <div key={contact.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <span>{contact.name || contact.phone}</span>
                  <Badge variant="outline" className="text-xs">
                    {contact.status}
                  </Badge>
                </div>
              ))}
              
              {selectedContacts.length > 5 && (
                <div className="text-center p-2 text-sm text-muted-foreground">
                  ... e mais {selectedContacts.length - 5} contatos
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}