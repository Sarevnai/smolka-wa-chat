import { useState } from "react";
import { ChevronDown, Plus, Edit, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageTemplate } from "@/types/campaign";
import { useTemplates, getBuiltInTemplates } from "@/hooks/useTemplates";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
  selectedTemplate?: MessageTemplate;
  onTemplateSelect: (template: MessageTemplate | null) => void;
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
  
  const { data: customTemplates = [] } = useTemplates();
  const builtInTemplates = getBuiltInTemplates();
  const allTemplates = [...builtInTemplates, ...customTemplates];

  const filteredTemplates = selectedCategory === "all" 
    ? allTemplates 
    : allTemplates.filter(t => t.category === selectedCategory);

  const groupedTemplates = filteredTemplates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, MessageTemplate[]>);

  const handleTemplateClick = (template: MessageTemplate) => {
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
          Escolha um template pré-configurado ou crie uma mensagem personalizada
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
          {Object.entries(groupedTemplates).map(([category, templates]) => (
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
                        {template.variables.length > 0 && (
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
                          {replaceVariables(template.content, template.variables)}
                        </p>
                        
                        {template.variables.length > 0 && (
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

        {filteredTemplates.length === 0 && (
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
      </CardContent>
    </Card>
  );
}