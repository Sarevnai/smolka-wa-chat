import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, ExternalLink, Loader2 } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Voice {
  voice_id: string;
  name: string;
  labels: {
    accent?: string;
    gender?: string;
  };
}

interface StepElevenLabsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepElevenLabs({ data, updateData }: StepElevenLabsProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);

  const fetchVoices = async () => {
    if (!data.elevenlabsApiKey) return;
    
    setLoadingVoices(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('elevenlabs-list-voices', {
        body: { apiKey: data.elevenlabsApiKey }
      });
      
      if (error) throw error;
      if (response?.voices) {
        setVoices(response.voices);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setLoadingVoices(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
          <Volume2 className="h-8 w-8 text-orange-600" />
        </div>
        <h3 className="text-2xl font-semibold">Configurar ElevenLabs</h3>
        <p className="text-muted-foreground mt-2">
          Adicione voz ao seu agente virtual (opcional)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Síntese de Voz</CardTitle>
          <CardDescription>
            Configure o ElevenLabs para respostas em áudio. Esta etapa é opcional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="elevenlabsApiKey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="elevenlabsApiKey"
                type="password"
                placeholder="sk_..."
                value={data.elevenlabsApiKey}
                onChange={(e) => updateData({ elevenlabsApiKey: e.target.value })}
              />
              <Button 
                variant="outline" 
                onClick={fetchVoices}
                disabled={!data.elevenlabsApiKey || loadingVoices}
              >
                {loadingVoices ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar Vozes'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenha sua chave em{' '}
              <Button variant="link" className="p-0 h-auto text-xs" asChild>
                <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">
                  elevenlabs.io <ExternalLink className="h-3 w-3 ml-1 inline" />
                </a>
              </Button>
            </p>
          </div>

          {voices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="elevenlabsVoiceId">Voz</Label>
              <Select 
                value={data.elevenlabsVoiceId} 
                onValueChange={(value) => updateData({ elevenlabsVoiceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma voz" />
                </SelectTrigger>
                <SelectContent>
                  {voices.map((voice) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} {voice.labels?.gender && `(${voice.labels.gender})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">🎤 Por que usar ElevenLabs?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Respostas de áudio naturais e realistas</li>
          <li>• Suporte a múltiplos idiomas incluindo português</li>
          <li>• Ideal para clientes que preferem mensagens de voz</li>
        </ul>
      </div>
    </div>
  );
}
