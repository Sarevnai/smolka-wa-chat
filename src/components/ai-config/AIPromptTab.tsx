import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Save, 
  AlertTriangle, 
  Eye, 
  Edit3, 
  FileText,
  Loader2,
  Check,
  Home,
  Building2,
  Settings,
  Globe,
  Building
} from "lucide-react";
import { toast } from "sonner";
import { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";
import { 
  buildPromptPreview, 
  estimateTokens, 
  getTokenStatus,
  DepartmentCode
} from "@/lib/promptBuilder";

interface AIPromptTabProps {
  config: AIAgentConfig;
  updateConfig: (updates: Partial<AIAgentConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
}

const DEPARTMENTS: { code: DepartmentCode; label: string; icon: typeof Home }[] = [
  { code: 'locacao', label: 'Locação', icon: Home },
  { code: 'vendas', label: 'Vendas', icon: Building2 },
  { code: 'administrativo', label: 'Admin', icon: Settings },
  { code: 'empreendimentos', label: 'Empreend.', icon: Building },
  { code: 'geral', label: 'Geral', icon: Globe },
];

export function AIPromptTab({ config, updateConfig, saveConfig, isSaving }: AIPromptTabProps) {
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCode>('locacao');
  const [copied, setCopied] = useState(false);
  
  // Get override status for current department
  const currentOverride = config.prompt_overrides?.[selectedDepartment] || null;
  const isOverrideEnabled = !!currentOverride;
  
  // Generate prompt preview
  const promptPreview = useMemo(() => {
    if (isOverrideEnabled && currentOverride) {
      return currentOverride;
    }
    return buildPromptPreview(config, selectedDepartment);
  }, [config, selectedDepartment, isOverrideEnabled, currentOverride]);
  
  // Token estimation
  const tokenCount = useMemo(() => estimateTokens(promptPreview), [promptPreview]);
  const tokenStatus = useMemo(() => getTokenStatus(tokenCount), [tokenCount]);
  
  // Handle copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptPreview);
      setCopied(true);
      toast.success('Prompt copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar prompt');
    }
  };
  
  // Toggle override mode
  const handleToggleOverride = (enabled: boolean) => {
    const currentOverrides = config.prompt_overrides || {
      locacao: null,
      vendas: null,
      administrativo: null,
      geral: null,
      empreendimentos: null,
    };
    
    if (enabled) {
      // Enable override - copy current generated prompt as starting point
      const generatedPrompt = buildPromptPreview(config, selectedDepartment);
      updateConfig({
        prompt_overrides: {
          ...currentOverrides,
          [selectedDepartment]: generatedPrompt,
        }
      });
    } else {
      // Disable override - set to null
      updateConfig({
        prompt_overrides: {
          ...currentOverrides,
          [selectedDepartment]: null,
        }
      });
    }
  };
  
  // Update override content
  const handleOverrideChange = (value: string) => {
    const currentOverrides = config.prompt_overrides || {
      locacao: null,
      vendas: null,
      administrativo: null,
      geral: null,
      empreendimentos: null,
    };
    
    updateConfig({
      prompt_overrides: {
        ...currentOverrides,
        [selectedDepartment]: value,
      }
    });
  };
  
  // Update custom instructions
  const handleCustomInstructionsChange = (value: string) => {
    updateConfig({ custom_instructions: value });
  };
  
  return (
    <div className="space-y-6">
      {/* Department Selector */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Prompt por Departamento
              </CardTitle>
              <CardDescription>
                Visualize e personalize o prompt de cada departamento
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={tokenStatus.color}>
                ~{tokenCount.toLocaleString()} tokens ({tokenStatus.label})
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedDepartment} onValueChange={(v) => setSelectedDepartment(v as DepartmentCode)}>
            <TabsList className="grid w-full grid-cols-5">
              {DEPARTMENTS.map((dept) => {
                const Icon = dept.icon;
                const hasOverride = !!config.prompt_overrides?.[dept.code];
                return (
                  <TabsTrigger key={dept.code} value={dept.code} className="relative gap-1.5">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{dept.label}</span>
                    {hasOverride && (
                      <span className="absolute -top-1 -right-1 h-2 w-2 bg-orange-500 rounded-full" />
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Prompt Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {isOverrideEnabled ? 'Prompt Customizado' : 'Preview do Prompt'}
              </CardTitle>
              {isOverrideEnabled && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  Override Ativo
                </Badge>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copiar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/90">
              {promptPreview}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Edit3 className="h-5 w-5 text-muted-foreground" />
            Instruções Personalizadas
          </CardTitle>
          <CardDescription>
            Este texto é adicionado ao final do prompt com o cabeçalho "INSTRUÇÕES ESPECIAIS:"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={config.custom_instructions || ''}
            onChange={(e) => handleCustomInstructionsChange(e.target.value)}
            placeholder="Ex: Sempre mencione que temos condições especiais para pagamento à vista..."
            className="min-h-[120px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            💡 Dica: Use este campo para adicionar regras específicas sem substituir todo o prompt.
          </p>
        </CardContent>
      </Card>
      
      {/* Full Override Mode */}
      <Card className="border-orange-200 dark:border-orange-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Override Completo (Modo Avançado)
              </CardTitle>
              <CardDescription>
                Substitui 100% do prompt gerado automaticamente
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="override-mode"
                checked={isOverrideEnabled}
                onCheckedChange={handleToggleOverride}
              />
              <Label htmlFor="override-mode" className="text-sm">
                {isOverrideEnabled ? 'Ativo' : 'Inativo'}
              </Label>
            </div>
          </div>
        </CardHeader>
        
        {isOverrideEnabled && (
          <CardContent className="space-y-4">
            <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900/50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-300">
                <strong>Atenção:</strong> Este prompt substituirá completamente o prompt gerado automaticamente 
                para o departamento <strong>{DEPARTMENTS.find(d => d.code === selectedDepartment)?.label}</strong>. 
                Certifique-se de incluir todas as instruções necessárias.
              </AlertDescription>
            </Alert>
            
            <Textarea
              value={currentOverride || ''}
              onChange={(e) => handleOverrideChange(e.target.value)}
              placeholder="Cole ou escreva o prompt completo aqui..."
              className="min-h-[400px] font-mono text-sm"
            />
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {currentOverride?.length || 0} caracteres | ~{estimateTokens(currentOverride || '')} tokens
              </span>
              <span>
                Mín: 100 chars | Máx: 32.000 chars
              </span>
            </div>
          </CardContent>
        )}
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveConfig} 
          disabled={isSaving}
          size="lg"
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
