import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Cpu, 
  Clock, 
  Save, 
  Loader2, 
  Volume2, 
  RefreshCw, 
  ChevronDown,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";

interface AITechnicalTabProps {
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

interface VoiceOption {
  id: string;
  name: string;
  category: string;
  description: string;
}

const fallbackVoiceOptions: VoiceOption[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade', description: 'Feminina, calorosa' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'premade', description: 'Feminina, amigável' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', category: 'premade', description: 'Feminina, profissional' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'premade', description: 'Feminina, conversacional' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'premade', description: 'Feminina, suave' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'premade', description: 'Masculina, autoritária' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade', description: 'Masculina, casual' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade', description: 'Masculina, britânica' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade', description: 'Masculina, americana' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade', description: 'Masculina, grave' },
];

export function AITechnicalTab({ config, updateConfig, saveConfig, isSaving }: AITechnicalTabProps) {
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(fallbackVoiceOptions);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [audioOpen, setAudioOpen] = useState(config.audio_enabled);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = providerModels[provider][0].value;
    updateConfig({ ai_provider: provider, ai_model: defaultModel });
  };

  const updateScheduleConfig = (updates: Partial<AIAgentConfig['schedule_config']>) => {
    updateConfig({
      schedule_config: { ...config.schedule_config, ...updates }
    });
  };

  const loadVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-list-voices');
      
      if (error) {
        console.error('Error loading voices:', error);
        toast.error('Erro ao carregar vozes. Usando vozes padrão.');
        return;
      }
      
      if (data?.success && data.voices?.length > 0) {
        setVoiceOptions(data.voices);
        setVoicesLoaded(true);
        toast.success(`${data.voices.length} vozes carregadas da sua conta ElevenLabs`);
      } else {
        toast.error('Nenhuma voz encontrada na conta ElevenLabs');
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      toast.error('Erro ao carregar vozes');
    } finally {
      setIsLoadingVoices(false);
    }
  }, []);

  const handleVoiceChange = (voiceIdOrName: string) => {
    const voice = voiceOptions.find(v => v.id === voiceIdOrName) || 
                  voiceOptions.find(v => v.name === voiceIdOrName);
    if (voice) {
      updateConfig({
        audio_voice_name: voice.name,
        audio_voice_id: voice.id
      });
    }
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
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Instruções extras que serão adicionadas ao prompt do sistema
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Humanization Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            <CardTitle>Humanização</CardTitle>
          </div>
          <CardDescription>Configurações para tornar a IA mais natural</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="font-medium">Humanizar Respostas</Label>
              <p className="text-sm text-muted-foreground">
                Adiciona características humanas às respostas da IA
              </p>
            </div>
            <Switch
              checked={config.humanize_responses}
              onCheckedChange={(checked) => updateConfig({ humanize_responses: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="font-medium">Fragmentar Mensagens Longas</Label>
              <p className="text-sm text-muted-foreground">
                Divide mensagens longas em partes menores
              </p>
            </div>
            <Switch
              checked={config.fragment_long_messages}
              onCheckedChange={(checked) => updateConfig({ fragment_long_messages: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Delay entre Mensagens (ms)</Label>
            <Input
              type="number"
              value={config.message_delay_ms}
              onChange={(e) => updateConfig({ message_delay_ms: parseInt(e.target.value) || 2000 })}
              min={0}
              max={10000}
            />
            <p className="text-xs text-muted-foreground">
              Tempo de espera antes de enviar a resposta
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings (Collapsible) */}
      <Collapsible open={audioOpen} onOpenChange={setAudioOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5 text-emerald-500" />
                  <CardTitle>Respostas por Áudio</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={config.audio_enabled ? "default" : "secondary"}>
                    {config.audio_enabled ? "Ativo" : "Desativado"}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${audioOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CardDescription>Configure o Text-to-Speech (ElevenLabs)</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <Label className="font-medium">Habilitar Áudio</Label>
                  <p className="text-sm text-muted-foreground">
                    A IA poderá enviar respostas em áudio usando Text-to-Speech
                  </p>
                </div>
                <Switch
                  checked={config.audio_enabled}
                  onCheckedChange={(checked) => updateConfig({ audio_enabled: checked })}
                />
              </div>

              {config.audio_enabled && (
                <>
                  <Separator />

                  {/* Voice Selection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Voz do Agente</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadVoices}
                        disabled={isLoadingVoices}
                      >
                        {isLoadingVoices ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        {voicesLoaded ? 'Atualizar' : 'Carregar Vozes'}
                      </Button>
                    </div>
                    
                    <Select 
                      value={config.audio_voice_id || config.audio_voice_name} 
                      onValueChange={handleVoiceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma voz" />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceOptions.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex flex-col">
                              <span>{voice.name}</span>
                              <span className="text-xs text-muted-foreground">{voice.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Audio Mode */}
                  <div className="space-y-3">
                    <Label>Modo de Resposta</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'text_only', label: 'Só Texto' },
                        { value: 'text_and_audio', label: 'Texto + Áudio' },
                        { value: 'audio_only', label: 'Só Áudio' },
                      ].map((mode) => (
                        <div
                          key={mode.value}
                          className={`p-2 rounded-lg border-2 cursor-pointer text-center text-sm transition-all ${
                            config.audio_mode === mode.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => updateConfig({ audio_mode: mode.value as AIAgentConfig['audio_mode'] })}
                        >
                          {mode.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Channel Mirroring */}
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <Label className="font-medium">Espelhar Canal</Label>
                      <p className="text-sm text-muted-foreground">
                        Se cliente envia áudio, responder em áudio
                      </p>
                    </div>
                    <Switch
                      checked={config.audio_channel_mirroring}
                      onCheckedChange={(checked) => updateConfig({ audio_channel_mirroring: checked })}
                    />
                  </div>

                  {/* Character Limit */}
                  <div className="space-y-2">
                    <Label>Limite de Caracteres para Áudio</Label>
                    <Input
                      type="number"
                      value={config.audio_max_chars}
                      onChange={(e) => updateConfig({ audio_max_chars: parseInt(e.target.value) || 400 })}
                      min={100}
                      max={2000}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mensagens maiores serão enviadas apenas como texto
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Schedule Config (Collapsible) */}
      <Collapsible open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <CardTitle>Horários de Automação</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {config.schedule_config.mode === 'always_active' ? '24/7' : 
                     config.schedule_config.mode === 'outside_hours_only' ? 'Fora do expediente' : 
                     config.schedule_config.mode === 'business_hours_only' ? 'Horário comercial' : 'Personalizado'}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${scheduleOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CardDescription>Configure quando o agente IA deve estar ativo</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4 pt-0">
              {/* Operation Mode */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'always_active', label: 'Sempre Ativa', icon: '🤖' },
                  { value: 'outside_hours_only', label: 'Fora do Horário', icon: '🌙' },
                  { value: 'business_hours_only', label: 'Horário Comercial', icon: '☀️' },
                  { value: 'scheduled', label: 'Personalizado', icon: '📅' },
                ].map((mode) => (
                  <div
                    key={mode.value}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      config.schedule_config.mode === mode.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => updateScheduleConfig({ mode: mode.value as AIOperationMode })}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{mode.icon}</span>
                      <span className="font-medium text-sm">{mode.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Default Hours */}
              {(config.schedule_config.mode === 'business_hours_only' || config.schedule_config.mode === 'outside_hours_only') && (
                <div className="space-y-3 pt-2">
                  <Label className="text-sm font-medium">Horário Comercial</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Início</Label>
                      <Input
                        type="time"
                        value={config.schedule_config.default_hours.start}
                        onChange={(e) => updateScheduleConfig({
                          default_hours: { ...config.schedule_config.default_hours, start: e.target.value }
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fim</Label>
                      <Input
                        type="time"
                        value={config.schedule_config.default_hours.end}
                        onChange={(e) => updateScheduleConfig({
                          default_hours: { ...config.schedule_config.default_hours, end: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                      <Badge
                        key={index}
                        variant={config.schedule_config.default_hours.days.includes(index) ? 'default' : 'outline'}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
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
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Configurações Técnicas
        </Button>
      </div>
    </div>
  );
}
