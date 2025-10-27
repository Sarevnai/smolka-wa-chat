import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWhatsAppTemplates, WhatsAppTemplate, getTemplatePreview } from "@/hooks/useWhatsAppTemplates";
import { useQuickTemplate } from "@/hooks/useQuickTemplate";
import { useContactByPhone } from "@/hooks/useContacts";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuickTemplateSenderProps {
  phoneNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickTemplateSender({ 
  phoneNumber, 
  open, 
  onOpenChange,
  onSuccess 
}: QuickTemplateSenderProps) {
  const { data: templates, isLoading: loadingTemplates } = useWhatsAppTemplates();
  const { data: contact } = useContactByPhone(phoneNumber);
  const { sendTemplate, isLoading: sending } = useQuickTemplate();
  const { profile } = useAuth();
  
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string>("");

  // Extract placeholders from template (supports both named and numeric)
  const extractPlaceholders = (template: WhatsAppTemplate): string[] => {
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return [];
    
    // Match both {{1}} (numeric) and {{nome}} (named) patterns
    const matches = bodyComponent.text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    return matches.map(m => m.replace(/[{}]/g, ''));
  };

  // Auto-fill variables when template or contact changes
  useEffect(() => {
    if (selectedTemplate) {
      const placeholders = extractPlaceholders(selectedTemplate);
      const autoFilled: Record<string, string> = {};
      
      // Auto-fill for named variables
      if (placeholders.includes('nome') && contact?.name) {
        autoFilled['nome'] = contact.name;
      }
      if (placeholders.includes('user') && profile?.full_name) {
        autoFilled['user'] = profile.full_name;
      }
      if (placeholders.includes('contrato') && contact?.contracts?.[0]?.contract_number) {
        autoFilled['contrato'] = contact.contracts[0].contract_number;
      }
      if (placeholders.includes('imovel') && contact?.contracts?.[0]?.property_code) {
        autoFilled['imovel'] = contact.contracts[0].property_code;
      }
      
      // Auto-fill for numeric variables (backward compatibility)
      if (placeholders.includes('1') && contact?.name) {
        autoFilled['1'] = contact.name;
      }
      if (placeholders.includes('2') && contact?.contracts?.[0]?.contract_number) {
        autoFilled['2'] = contact.contracts[0].contract_number;
      }
      if (placeholders.includes('3') && contact?.contracts?.[0]?.property_code) {
        autoFilled['3'] = contact.contracts[0].property_code;
      }
      
      setVariables(autoFilled);
    }
  }, [selectedTemplate, contact, profile]);

  // Update preview when template or variables change
  useEffect(() => {
    if (!selectedTemplate) {
      setPreview("");
      return;
    }

    const bodyComponent = selectedTemplate.components.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) {
      setPreview(selectedTemplate.template_name);
      return;
    }

    let previewText = bodyComponent.text;
    
    // Replace placeholders with actual values or [Variable X]
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      previewText = previewText.replace(
        new RegExp(placeholder, 'g'),
        value || `[Variável ${key}]`
      );
    });

    setPreview(previewText);
  }, [selectedTemplate, variables]);

  const handleSend = async () => {
    if (!selectedTemplate) return;

    const placeholders = extractPlaceholders(selectedTemplate);
    const allFilled = placeholders.every(p => variables[p]?.trim());
    
    if (!allFilled) {
      return;
    }

    try {
      await sendTemplate({
        phoneNumber,
        templateName: selectedTemplate.template_name,
        languageCode: selectedTemplate.language,
        variables
      });
      
      onSuccess?.();
      onOpenChange(false);
      
      // Reset state
      setSelectedTemplate(null);
      setVariables({});
    } catch (error) {
      console.error("Error sending template:", error);
    }
  };

  const isValid = () => {
    if (!selectedTemplate) return false;
    const placeholders = extractPlaceholders(selectedTemplate);
    return placeholders.every(p => variables[p]?.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Iniciar Conversa com Template
          </DialogTitle>
          <DialogDescription>
            Envie um template aprovado para abrir a janela de 24 horas
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplate?.id || ""}
                onValueChange={(value) => {
                  const template = templates?.find(t => t.id === value);
                  setSelectedTemplate(template || null);
                  setVariables({});
                }}
                disabled={loadingTemplates}
              >
                <SelectTrigger id="template">
                  <SelectValue placeholder="Selecione um template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.template_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview Card */}
            {selectedTemplate && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Preview</Label>
                    <div className="bg-white p-4 rounded-lg border border-border shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">{preview}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Variables Form */}
            {selectedTemplate && extractPlaceholders(selectedTemplate).length > 0 && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">Variáveis do Template</Label>
                {extractPlaceholders(selectedTemplate).map((placeholder) => {
                  // Generate friendly labels for common variables
                  const isNumeric = /^\d+$/.test(placeholder);
                  let label = isNumeric ? `Variável ${placeholder}` : placeholder;
                  let hint = '';
                  
                  if (placeholder === 'nome' || placeholder === '1') {
                    hint = ' (Nome do contato)';
                  } else if (placeholder === 'user') {
                    hint = ' (Atendente)';
                  } else if (placeholder === 'contrato' || placeholder === '2') {
                    hint = ' (Número do contrato)';
                  } else if (placeholder === 'imovel' || placeholder === '3') {
                    hint = ' (Código do imóvel)';
                  }
                  
                  return (
                    <div key={placeholder} className="space-y-2">
                      <Label htmlFor={`var-${placeholder}`} className="text-sm">
                        {label}{hint}
                      </Label>
                      <Input
                        id={`var-${placeholder}`}
                        value={variables[placeholder] || ""}
                        onChange={(e) => setVariables(prev => ({
                          ...prev,
                          [placeholder]: e.target.value
                        }))}
                        placeholder={`Digite o valor para {{${placeholder}}}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Contact Info */}
            {contact && (
              <div className="bg-muted/30 p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Enviando para:</p>
                <p className="text-muted-foreground">
                  {contact.name || phoneNumber}
                  {contact.contracts?.[0] && ` • ${contact.contracts[0].contract_number}`}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={!isValid() || sending}
            className="gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Template
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
