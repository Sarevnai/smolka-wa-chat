import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';

interface StepAIAgentProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepAIAgent({ data, updateData }: StepAIAgentProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4">
          <Bot className="h-8 w-8 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-semibold">Configurar Agente IA</h3>
        <p className="text-muted-foreground mt-2">
          Defina a identidade e personalidade do seu assistente virtual
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identidade do Agente</CardTitle>
          <CardDescription>
            Essas informações definem como o agente se apresenta aos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agentName">
                Nome do Agente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="agentName"
                placeholder="Ex: Arya, Assistente Virtual"
                value={data.agentName}
                onChange={(e) => updateData({ agentName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Nome que o agente usará para se identificar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">
                Nome da Empresa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                placeholder="Ex: Imobiliária XYZ"
                value={data.companyName}
                onChange={(e) => updateData({ companyName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Nome da sua imobiliária ou empresa
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="communicationTone">Tom de Comunicação</Label>
            <Select 
              value={data.communicationTone} 
              onValueChange={(value) => updateData({ communicationTone: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal - Profissional e respeitoso</SelectItem>
                <SelectItem value="friendly">Amigável - Cordial e acolhedor</SelectItem>
                <SelectItem value="casual">Casual - Descontraído e acessível</SelectItem>
                <SelectItem value="technical">Técnico - Preciso e detalhado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="greetingMessage">Mensagem de Saudação</Label>
            <Textarea
              id="greetingMessage"
              placeholder="Ex: Olá! Sou a Arya, assistente virtual da Imobiliária XYZ. Como posso ajudá-lo hoje?"
              value={data.greetingMessage}
              onChange={(e) => updateData({ greetingMessage: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Primeira mensagem que o agente envia ao cliente
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {(data.agentName || data.companyName) && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Prévia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3 max-w-[80%]">
              <p className="text-sm">
                {data.greetingMessage || 
                  `Olá! Sou ${data.agentName || '[Nome do Agente]'}, assistente virtual da ${data.companyName || '[Empresa]'}. Como posso ajudá-lo hoje?`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
