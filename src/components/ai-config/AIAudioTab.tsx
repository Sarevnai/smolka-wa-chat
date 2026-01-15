import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Volume2, Save, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";

interface AIAudioTabProps {
  config: AIAgentConfig;
  updateConfig: (updates: Partial<AIAgentConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
}

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

export function AIAudioTab({ config, updateConfig, saveConfig, isSaving }: AIAudioTabProps) {
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(fallbackVoiceOptions);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

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
      {/* Audio Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle>Respostas por Áudio</CardTitle>
          </div>
          <CardDescription>Configure o Text-to-Speech para respostas em áudio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Audio */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <Label className="text-base font-medium">Habilitar Áudio</Label>
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
              <div className="space-y-4">
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
                    {voicesLoaded ? 'Atualizar Vozes' : 'Carregar Vozes ElevenLabs'}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { value: 'text_only', label: 'Apenas Texto', description: 'Sem áudio' },
                    { value: 'text_and_audio', label: 'Texto + Áudio', description: 'Envia ambos' },
                    { value: 'audio_only', label: 'Apenas Áudio', description: 'Só áudio' },
                  ].map((mode) => (
                    <div
                      key={mode.value}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        config.audio_mode === mode.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => updateConfig({ audio_mode: mode.value as AIAgentConfig['audio_mode'] })}
                    >
                      <p className="font-medium text-sm">{mode.label}</p>
                      <p className="text-xs text-muted-foreground">{mode.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Channel Mirroring */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-base font-medium">Espelhar Canal do Cliente</Label>
                  <p className="text-sm text-muted-foreground">
                    Se o cliente enviar áudio, responder em áudio. Se texto, responder em texto.
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
                  Mensagens maiores que este limite serão enviadas apenas como texto
                </p>
              </div>
            </>
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
          Salvar Configurações de Áudio
        </Button>
      </div>
    </div>
  );
}
