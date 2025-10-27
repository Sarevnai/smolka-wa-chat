import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Info, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TemplateVariablesFormProps {
  templateText: string;
  onVariablesChange: (variables: Record<string, string>) => void;
  defaultValues?: Record<string, string>;
}

export function TemplateVariablesForm({ 
  templateText, 
  onVariablesChange,
  defaultValues = {}
}: TemplateVariablesFormProps) {
  // Extract variables from template
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(v => v.replace(/\{|\}/g, '')))];
  };

  const variables = extractVariables(templateText);
  const [values, setValues] = useState<Record<string, string>>(defaultValues);

  useEffect(() => {
    onVariablesChange(values);
  }, [values, onVariablesChange]);

  useEffect(() => {
    // Initialize with default values
    const initialValues: Record<string, string> = {};
    variables.forEach(varName => {
      initialValues[varName] = defaultValues[varName] || '';
    });
    setValues(initialValues);
  }, [templateText]);

  const getVariableLabel = (varName: string): string => {
    const labels: Record<string, string> = {
      'nome': 'Nome do Contato',
      'name': 'Nome do Contato',
      'user': 'Nome do Atendente',
      'usuario': 'Nome do Atendente',
      'empresa': 'Nome da Empresa',
      'contrato': 'Número do Contrato',
      'valor': 'Valor',
      'data': 'Data',
      'endereco': 'Endereço',
    };
    return labels[varName.toLowerCase()] || varName.charAt(0).toUpperCase() + varName.slice(1);
  };

  const getVariableDescription = (varName: string): string => {
    const descriptions: Record<string, string> = {
      'nome': 'Preenchido automaticamente com o nome do contato',
      'name': 'Preenchido automaticamente com o nome do contato',
      'user': 'Preenchido automaticamente com seu nome',
      'usuario': 'Preenchido automaticamente com seu nome',
    };
    return descriptions[varName.toLowerCase()] || 'Valor personalizado para esta variável';
  };

  const isAutoFilled = (varName: string): boolean => {
    return ['nome', 'name', 'user', 'usuario'].includes(varName.toLowerCase());
  };

  if (variables.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Variáveis do Template
        </CardTitle>
        <CardDescription>
          Configure valores padrão para as variáveis. Valores automáticos podem ser sobrescritos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {variables.map((varName) => (
          <div key={varName} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={`var-${varName}`} className="text-sm font-medium">
                {getVariableLabel(varName)}
              </Label>
              {isAutoFilled(varName) && (
                <Badge variant="secondary" className="text-xs">
                  Auto
                </Badge>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{getVariableDescription(varName)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id={`var-${varName}`}
              type="text"
              value={values[varName] || ''}
              onChange={(e) => setValues(prev => ({ ...prev, [varName]: e.target.value }))}
              placeholder={
                isAutoFilled(varName) 
                  ? `Será preenchido automaticamente` 
                  : `Digite o valor para {{${varName}}}`
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Aparece no template como: <code className="bg-muted px-1 py-0.5 rounded">{`{{${varName}}}`}</code>
            </p>
          </div>
        ))}
        
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>
              Variáveis marcadas como "Auto" serão preenchidas automaticamente para cada contato.
              Você pode sobrescrever com um valor fixo se desejar.
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
