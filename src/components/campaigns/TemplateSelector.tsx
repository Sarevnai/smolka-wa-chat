import { useState } from "react";
import { ChevronDown, Plus, Edit, Trash2, Copy, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageTemplate } from "@/types/campaign";
import { useTemplates, getBuiltInTemplates } from "@/hooks/useTemplates";
import { WhatsAppTemplate, useWhatsAppTemplates, isOfficialWhatsAppTemplate, getTemplatePreview } from "@/hooks/useWhatsAppTemplates";
import { cn } from "@/lib/utils";
import SyncTemplatesButton from "./SyncTemplatesButton";

interface TemplateSelectorProps {
  selectedTemplate?: MessageTemplate | WhatsAppTemplate;
  onTemplateSelect: (template: MessageTemplate | WhatsAppTemplate | null) => void;
  onCreateNew?: () => void;
}

const categoryLabels = {
  cobranca: "Cobrança",
  manutencao: "Manutenção", 
  promocao: "Promoção",
  comunicado: "Comunicado",
  lembrete: "Lembrete",
  personalizado: "Personalizado"
};

const categoryColors = {
  cobranca: "bg-red-100 text-red-800 border-red-200",
  manutencao: "bg-yellow-100 text-yellow-800 border-yellow-200",
  promocao: "bg-green-100 text-green-800 border-green-200", 
  comunicado: "bg-blue-100 text-blue-800 border-blue-200",
  lembrete: "bg-purple-100 text-purple-800 border-purple-200",
  personalizado: "bg-gray-100 text-gray-800 border-gray-200"
};

export default function TemplateSelector({ selectedTemplate, onTemplateSelect, onCreateNew }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"internal" | "whatsapp">("internal");
  
  const { data: customTemplates = [] } = useTemplates();
  const { data: whatsappTemplates = [], isLoading: isLoadingWhatsApp } = useWhatsAppTemplates();
  const builtInTemplates = getBuiltInTemplates();
  
  const allInternalTemplates = [...builtInTemplates, ...customTemplates];

  const filteredInternalTemplates = selectedCategory === "all" 
    ? allInternalTemplates 
    : allInternalTemplates.filter(t => t.category === selectedCategory);

  const groupedInternalTemplates = filteredInternalTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  const handleTemplateClick = (template: MessageTemplate | WhatsAppTemplate) => {
    onTemplateSelect(selectedTemplate?.id === template.id ? null : template);
  };

  const replaceVariables = (content: string, variables: string[]) => {
    let result = content;
    variables.forEach(variable => {
      const placeholder = `{{${variable}}}`;
      const sampleValue = getSampleValue(variable);
      result = result.replace(new RegExp(placeholder, 'g'), `[${sampleValue}]`);
    });
    return result;
  };

  const getSampleValue = (variable: string): string => {
    const samples = {
      nome: "João Silva",
      contrato: "12345",
      valor: "1.200,00", 
      endereco: "Rua das Flores, 123",
      data: "25/01/2024",
      horario: "14:00",
      mensagem: "informação importante"
    };
    return samples[variable as keyof typeof samples] || variable;
  };

  const renderInternalTemplates = () => (
    <div className="space-y-4">
      {/* Category Filter */}
      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as categorias</SelectItem>
          {Object.entries(categoryLabels).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Templates List */}
      <div className="space-y-3">
        {Object.entries(groupedInternalTemplates).map(([category, templates]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", categoryColors[category as keyof typeof categoryColors])}>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </Badge>
              <span>({templates.length})</span>
            </h4>
            
            {templates.map((template) => (
              <Card 
                key={template.id} 
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-md",
                  selectedTemplate?.id === template.id 
                    ? "ring-2 ring-primary border-primary" 
                    : "hover:border-primary/50"
                )}
                onClick={() => handleTemplateClick(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{template.name}</h5>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {template.variables && template.variables.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {template.variables.length} variáveis
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Collapsible open={selectedTemplate?.id === template.id}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
                        <span className="text-xs text-muted-foreground">
                          {selectedTemplate?.id === template.id ? "Ocultar prévia" : "Ver prévia"}
                        </span>
                        <ChevronDown className={cn(
                          "h-3 w-3 transition-transform",
                          selectedTemplate?.id === template.id && "rotate-180"
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-3 p-3 bg-muted rounded-md">
                      <p className="text-sm whitespace-pre-wrap">
                        {template.variables ? replaceVariables(template.content, template.variables) : template.content}
                      </p>
                      
                      {template.variables && template.variables.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Variáveis disponíveis:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map(variable => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>

      {filteredInternalTemplates.length === 0 && (
        <div className="text-center py-6 text-muted-foreground">
          <p>Nenhum template encontrado para esta categoria.</p>
          {onCreateNew && (
            <Button variant="outline" className="mt-2" onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro template
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // Function to count placeholders in template
  const countTemplatePlaceholders = (template: WhatsAppTemplate): number => {
    const bodyComponent = template.components?.find(c => c.type === 'BODY');
    if (!bodyComponent?.text) return 0;
    
    const placeholders = bodyComponent.text.match(/\{\{\d+\}\}/g);
    return placeholders ? placeholders.length : 0;
  };

  const renderWhatsAppTemplates = () => (
    <div className="space-y-4">
      {isLoadingWhatsApp ? (
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Carregando templates do WhatsApp...</p>
        </div>
      ) : whatsappTemplates.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <Globe className="h-8 w-8 mx-auto mb-2" />
          <p>Nenhum template do WhatsApp configurado.</p>
          <p className="text-xs mt-1">Configure templates oficiais na Meta Business para usar mensagens proativas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {whatsappTemplates.map((template) => {
            const placeholderCount = countTemplatePlaceholders(template);
            return (
            <Card 
              key={template.id}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:shadow-md",
                selectedTemplate?.id === template.id 
                  ? "ring-2 ring-primary border-primary" 
                  : "hover:border-primary/50"
              )}
              onClick={() => handleTemplateClick(template)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium text-sm">{template.template_name}</h5>
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        Oficial
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Globe className="h-3 w-3 mr-1" />
                        {template.language}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Categoria: {template.category} | {placeholderCount} parâmetros | ID: {template.template_id}
                    </p>
                  </div>
                </div>
                
                <Collapsible open={selectedTemplate?.id === template.id}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
                      <span className="text-xs text-muted-foreground">
                        {selectedTemplate?.id === template.id ? "Ocultar prévia" : "Ver prévia"}
                      </span>
                      <ChevronDown className={cn(
                        "h-3 w-3 transition-transform",
                        selectedTemplate?.id === template.id && "rotate-180"
                      )} />
                    </Button>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm whitespace-pre-wrap">
                      {getTemplatePreview(template)}
                    </p>
                    
                     <div className="mt-3 pt-3 border-t border-border">
                       <p className="text-xs font-medium text-green-700 mb-1">
                         ✓ Aprovado pela Meta para uso proativo
                       </p>
                       <p className="text-xs text-muted-foreground">
                         Este template pode ser usado para iniciar conversas com clientes.
                       </p>
                       {placeholderCount > 0 && (
                         <p className="text-xs text-amber-600 mt-1">
                           ⚠️ Template requer {placeholderCount} parâmetros - dados do contato serão usados automaticamente
                         </p>
                       )}
                     </div>
                   </CollapsibleContent>
                 </Collapsible>
               </CardContent>
             </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Templates de Mensagem
          {onCreateNew && (
            <Button variant="outline" size="sm" onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Novo
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Escolha entre templates internos ou oficiais do WhatsApp aprovados pela Meta
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "internal" | "whatsapp")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Templates Internos
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              WhatsApp Oficiais
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="internal" className="mt-4">
            {renderInternalTemplates()}
          </TabsContent>
          
          <TabsContent value="whatsapp" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-muted-foreground">
                Templates oficiais aprovados pela Meta
              </p>
              <SyncTemplatesButton />
            </div>
            {renderWhatsAppTemplates()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}