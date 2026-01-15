import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Brain, Sparkles, ExternalLink } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';
import { Button } from '@/components/ui/button';

interface StepAIProviderProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepAIProvider({ data, updateData }: StepAIProviderProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
          <Brain className="h-8 w-8 text-purple-600" />
        </div>
        <h3 className="text-2xl font-semibold">Provedor de Inteligência Artificial</h3>
        <p className="text-muted-foreground mt-2">
          Configure o provedor de IA para alimentar o agente virtual
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escolha o Provedor</CardTitle>
          <CardDescription>
            Selecione qual serviço de IA será usado para processar conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={data.aiProvider}
            onValueChange={(value: 'openai' | 'lovable') => updateData({ aiProvider: value })}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <Label
              htmlFor="provider-openai"
              className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem value="openai" id="provider-openai" className="mt-1" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">OpenAI</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Recomendado</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  GPT-4o e GPT-4o-mini. Maior qualidade e flexibilidade.
                </p>
              </div>
            </Label>

            <Label
              htmlFor="provider-lovable"
              className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem value="lovable" id="provider-lovable" className="mt-1" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-pink-500" />
                  <span className="font-medium">Lovable AI</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  IA integrada. Não requer configuração adicional.
                </p>
              </div>
            </Label>
          </RadioGroup>

          {data.aiProvider === 'openai' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="openaiApiKey">
                  API Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="openaiApiKey"
                  type="password"
                  placeholder="sk-..."
                  value={data.openaiApiKey}
                  onChange={(e) => updateData({ openaiApiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Obtenha sua chave em{' '}
                  <Button variant="link" className="p-0 h-auto text-xs" asChild>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                      platform.openai.com <ExternalLink className="h-3 w-3 ml-1 inline" />
                    </a>
                  </Button>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aiModel">Modelo</Label>
                <Select value={data.aiModel} onValueChange={(value) => updateData({ aiModel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Mais capaz)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o-mini (Equilibrado)</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
        <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">⚡ Dica de Custo</h4>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          O GPT-4o-mini oferece um excelente equilíbrio entre qualidade e custo para a maioria dos casos de uso. 
          Reserve o GPT-4o para cenários que exigem máxima precisão.
        </p>
      </div>
    </div>
  );
}
