import { useState } from "react";
import { Send, AlertTriangle, Users, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { MessageTemplate } from "@/types/campaign";
import { WhatsAppTemplate, isOfficialWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import { format } from "date-fns";

interface SendConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  campaignName: string;
  message: string;
  template?: MessageTemplate | WhatsAppTemplate | null;
  selectedContacts: string[];
  scheduledAt?: Date | null;
  validationErrors: string[];
}

export default function SendConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  campaignName,
  message,
  template,
  selectedContacts,
  scheduledAt,
  validationErrors
}: SendConfirmationModalProps) {
  const contactCount = selectedContacts.length;
  const estimatedCost = contactCount * 0.05;
  const isImmediate = !scheduledAt;
  const hasErrors = validationErrors.length > 0;

  const getTemplateInfo = () => {
    if (!template) return null;
    
    if (isOfficialWhatsAppTemplate(template)) {
      return {
        name: template.template_name,
        type: "WhatsApp Oficial",
        color: "bg-green-100 text-green-800",
        description: `Template aprovado pela Meta - Categoria: ${template.category}`
      };
    }
    
    return {
      name: template.name,
      type: "Template Interno",
      color: "bg-blue-100 text-blue-800",
      description: template.description || "Template personalizado"
    };
  };

  const templateInfo = getTemplateInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImmediate ? <Send className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
            {isImmediate ? "Confirmar Envio" : "Confirmar Agendamento"}
          </DialogTitle>
          <DialogDescription>
            Revise os detalhes antes de {isImmediate ? "enviar" : "agendar"} sua campanha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Errors */}
          {hasErrors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Corrija os seguintes problemas:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Campaign Summary */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Campanha:</p>
              <p className="font-medium">{campaignName}</p>
            </div>

            {templateInfo && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Template:</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={templateInfo.color}>
                    {templateInfo.type}
                  </Badge>
                  <span className="text-sm">{templateInfo.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {templateInfo.description}
                </p>
              </div>
            )}

            {scheduledAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agendamento:</p>
                <p className="font-medium">
                  {format(scheduledAt, "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-md">
              <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{contactCount}</p>
              <p className="text-xs text-muted-foreground">Destinatários</p>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-md">
              <MessageSquare className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{message.length}</p>
              <p className="text-xs text-muted-foreground">Caracteres</p>
            </div>
            
            <div className="text-center p-3 bg-muted rounded-md">
              <p className="text-lg font-bold text-green-600">
                R$ {estimatedCost.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Custo estimado</p>
            </div>
          </div>

          {/* Message Preview */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Prévia da mensagem:</p>
            <div className="p-3 bg-muted rounded-md border">
              <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">
                {message}
              </p>
              {message.length > 200 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Mensagem truncada para visualização...
                </p>
              )}
            </div>
          </div>

          {/* WhatsApp Rules Info */}
          {templateInfo?.type === "WhatsApp Oficial" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-800">
                  Template aprovado para uso proativo
                </p>
              </div>
              <p className="text-xs text-green-700">
                Este template pode ser enviado para qualquer contato, independente da janela de 24h.
              </p>
            </div>
          )}

          {!templateInfo && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <p className="font-medium">Regra do WhatsApp - Janela de 24h</p>
                <p>Mensagens livres só podem ser enviadas para contatos que interagiram nas últimas 24h. 
                Para contatos "frios", use templates aprovados.</p>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col gap-2">
          <div className="flex gap-2 w-full">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button 
              onClick={onConfirm}
              disabled={isLoading || hasErrors}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {isImmediate ? "Enviando..." : "Agendando..."}
                </>
              ) : (
                <>
                  {isImmediate ? <Send className="h-4 w-4 mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  {isImmediate ? "Confirmar Envio" : "Confirmar Agendamento"}
                </>
              )}
            </Button>
          </div>
          
          {hasErrors && (
            <p className="text-xs text-muted-foreground text-center">
              Corrija os erros acima para continuar
            </p>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}