import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, MessageSquare } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TemplateSelector from "@/components/campaigns/TemplateSelector";
import { HeaderMediaSelector } from "@/components/campaigns/HeaderMediaSelector";
import { TemplateVariablesForm } from "@/components/campaigns/TemplateVariablesForm";
import { MessageTemplate } from "@/types/campaign";
import { WhatsAppTemplate, isOfficialWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";

interface StepTemplateProps {
  selectedTemplate: MessageTemplate | WhatsAppTemplate | null;
  customMessage: string;
  headerMedia: {
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  } | null;
  customTemplateVariables: Record<string, string>;
  onTemplateSelect: (template: MessageTemplate | WhatsAppTemplate | null) => void;
  onCustomMessageChange: (message: string) => void;
  onHeaderMediaChange: (media: {
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  } | null) => void;
  onCustomTemplateVariablesChange: (variables: Record<string, string>) => void;
}

export default function StepTemplate({
  selectedTemplate,
  customMessage,
  headerMedia,
  customTemplateVariables,
  onTemplateSelect,
  onCustomMessageChange,
  onHeaderMediaChange,
  onCustomTemplateVariablesChange,
}: StepTemplateProps) {
  const renderMediaSelector = () => {
    if (!selectedTemplate || !isOfficialWhatsAppTemplate(selectedTemplate)) return null;
    
    const headerComponent = selectedTemplate.components?.find(c => c.type === 'HEADER');
    const mediaType = headerComponent?.format === 'IMAGE' ? 'image' 
      : headerComponent?.format === 'VIDEO' ? 'video'
      : headerComponent?.format === 'DOCUMENT' ? 'document' : null;
    
    if (!mediaType) return null;
    
    return (
      <HeaderMediaSelector
        mediaType={mediaType}
        onMediaSelect={onHeaderMediaChange}
        selectedMedia={headerMedia}
      />
    );
  };

  const renderVariablesForm = () => {
    if (!selectedTemplate || !isOfficialWhatsAppTemplate(selectedTemplate)) return null;
    
    const bodyComponent = selectedTemplate.components?.find(c => c.type === 'BODY');
    const templateText = bodyComponent?.text || '';
    
    if (!templateText) return null;
    
    return (
      <TemplateVariablesForm
        templateText={templateText}
        onVariablesChange={onCustomTemplateVariablesChange}
        defaultValues={customTemplateVariables}
      />
    );
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Escolha o Template</h2>
        <p className="text-muted-foreground mt-1">
          Selecione um template aprovado ou escreva uma mensagem personalizada
        </p>
      </div>

      <Tabs defaultValue="template" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="template" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Usar Template
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagem Personalizada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="template" className="space-y-4 mt-4">
          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onTemplateSelect={(template) => {
              onTemplateSelect(template as MessageTemplate | WhatsAppTemplate | null);
              onHeaderMediaChange(null);
              onCustomTemplateVariablesChange({});
            }}
          />
          
          {renderMediaSelector()}
          {renderVariablesForm()}
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Mensagem Personalizada</CardTitle>
              <CardDescription>
                Atenção: Mensagens personalizadas só podem ser enviadas dentro da janela de 24h
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="custom-message">Sua mensagem</Label>
                <Textarea
                  id="custom-message"
                  value={customMessage}
                  onChange={(e) => onCustomMessageChange(e.target.value)}
                  placeholder="Digite sua mensagem aqui..."
                  className="min-h-[150px] resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Use {"{{nome}}"} para personalizar com o nome do contato</span>
                  <span>{customMessage.length}/1000 caracteres</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
