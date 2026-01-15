import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Cpu, Clock, Save, Loader2 } from "lucide-react";
import type { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";

interface AIProviderTabProps {
  config: AIAgentConfig;
  updateConfig: (updates: Partial<AIAgentConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
}

type AIProvider = 'lovable' | 'openai';
type AIOperationMode = 'always_active' | 'business_hours_only' | 'outside_hours_only' | 'scheduled';

const providerModels: Record<AIProvider, { value: string; label: string; description: string }[]> = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Rápido e econômico (recomendado)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Mais capaz, maior custo' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Mais barato e rápido' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Melhor custo-benefício (recomendado)' },
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Mais capaz, maior custo' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Alta performance' },
  ],
};

export function AIProviderTab({ config, updateConfig, saveConfig, isSaving }: AIProviderTabProps) {
  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = providerModels[provider][0].value;
    updateConfig({ ai_provider: provider, ai_model: defaultModel });
  };

  const updateScheduleConfig = (updates: Partial<AIAgentConfig['schedule_config']>) => {
    updateConfig({
      schedule_config: { ...config.schedule_config, ...updates }
    });
  };

  return (
    <div className="space-y-6">
      {/* Provider & Model */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle>Provedor de IA</CardTitle>
          </div>
          <CardDescription>Escolha o provedor e modelo de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select value={config.ai_provider} onValueChange={handleProviderChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (créditos próprios)</SelectItem>
                  <SelectItem value="lovable">Lovable AI (Google Gemini)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select 
                value={config.ai_model} 
                onValueChange={(value) => updateConfig({ ai_model: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerModels[config.ai_provider].map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite de Tokens</Label>
              <Input
                type="number"
                value={config.max_tokens}
                onChange={(e) => updateConfig({ max_tokens: parseInt(e.target.value) || 500 })}
                min={100}
                max={2000}
              />
              <p className="text-xs text-muted-foreground">Tamanho máximo das respostas</p>
            </div>
            <div className="space-y-2">
              <Label>Histórico de Mensagens</Label>
              <Input
                type="number"
                value={config.max_history_messages}
                onChange={(e) => updateConfig({ max_history_messages: parseInt(e.target.value) || 5 })}
                min={1}
                max={20}
              />
              <p className="text-xs text-muted-foreground">Mensagens anteriores para contexto</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Instruções Customizadas</Label>
            <Textarea
              value={config.custom_instructions}
              onChange={(e) => updateConfig({ custom_instructions: e.target.value })}
              placeholder="Instruções adicionais para o modelo de IA..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Instruções extras que serão adicionadas ao prompt do sistema
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <CardTitle>Horários de Automação</CardTitle>
          </div>
          <CardDescription>Configure quando o agente IA deve estar ativo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation Mode */}
          <div className="space-y-3">
            <Label>Modo de Operação</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { value: 'always_active', label: 'Sempre Ativa', description: 'IA responde 24/7', icon: '🤖' },
                { value: 'outside_hours_only', label: 'Fora do Horário', description: 'IA ativa fora do expediente', icon: '🌙' },
                { value: 'business_hours_only', label: 'Horário Comercial', description: 'IA ativa apenas no expediente', icon: '☀️' },
                { value: 'scheduled', label: 'Personalizado', description: 'Configure horários por dia', icon: '📅' },
              ].map((mode) => (
                <div
                  key={mode.value}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    config.schedule_config.mode === mode.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => updateScheduleConfig({ mode: mode.value as AIOperationMode })}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mode.icon}</span>
                    <div>
                      <p className="font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Default Hours */}
          {(config.schedule_config.mode === 'business_hours_only' || config.schedule_config.mode === 'outside_hours_only') && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Horário Comercial</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Início</Label>
                  <Input
                    type="time"
                    value={config.schedule_config.default_hours.start}
                    onChange={(e) => updateScheduleConfig({
                      default_hours: { ...config.schedule_config.default_hours, start: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Fim</Label>
                  <Input
                    type="time"
                    value={config.schedule_config.default_hours.end}
                    onChange={(e) => updateScheduleConfig({
                      default_hours: { ...config.schedule_config.default_hours, end: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Dias de Expediente</Label>
                <div className="flex flex-wrap gap-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                    <Badge
                      key={index}
                      variant={config.schedule_config.default_hours.days.includes(index) ? 'default' : 'outline'}
                      className="cursor-pointer hover:opacity-80 transition-opacity px-3 py-1"
                      onClick={() => {
                        const days = config.schedule_config.default_hours.days;
                        const newDays = days.includes(index)
                          ? days.filter(d => d !== index)
                          : [...days, index].sort();
                        updateScheduleConfig({
                          default_hours: { ...config.schedule_config.default_hours, days: newDays }
                        });
                      }}
                    >
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom Schedule */}
          {config.schedule_config.mode === 'scheduled' && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Horários Personalizados</Label>
              <div className="space-y-3">
                {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => {
                  const daySchedule = config.schedule_config.custom_schedule[index] || { enabled: false, periods: [] };
                  return (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                      <div className="w-24">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={daySchedule.enabled}
                            onCheckedChange={(checked) => {
                              const newSchedule = { ...config.schedule_config.custom_schedule };
                              newSchedule[index] = {
                                ...daySchedule,
                                enabled: checked,
                                periods: checked && daySchedule.periods.length === 0 
                                  ? [{ start: '08:00', end: '18:00' }]
                                  : daySchedule.periods
                              };
                              updateScheduleConfig({ custom_schedule: newSchedule });
                            }}
                          />
                          <span className={`text-sm ${daySchedule.enabled ? 'font-medium' : 'text-muted-foreground'}`}>
                            {day.slice(0, 3)}
                          </span>
                        </div>
                      </div>
                      {daySchedule.enabled && (
                        <div className="flex flex-wrap gap-2 flex-1">
                          {daySchedule.periods.map((period, pIndex) => (
                            <div key={pIndex} className="flex items-center gap-1 bg-background rounded-md p-1">
                              <Input
                                type="time"
                                value={period.start}
                                className="w-24 h-8 text-sm"
                                onChange={(e) => {
                                  const newSchedule = { ...config.schedule_config.custom_schedule };
                                  newSchedule[index].periods[pIndex].start = e.target.value;
                                  updateScheduleConfig({ custom_schedule: newSchedule });
                                }}
                              />
                              <span className="text-muted-foreground">-</span>
                              <Input
                                type="time"
                                value={period.end}
                                className="w-24 h-8 text-sm"
                                onChange={(e) => {
                                  const newSchedule = { ...config.schedule_config.custom_schedule };
                                  newSchedule[index].periods[pIndex].end = e.target.value;
                                  updateScheduleConfig({ custom_schedule: newSchedule });
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
