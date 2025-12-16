import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Clock, Save, TestTube, ExternalLink, Key, Copy, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BusinessHours {
  start: string;
  end: string;
  days: number[];
  timezone: string;
}

export function N8NSettings() {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [forceAIMode, setForceAIMode] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    start: '08:00',
    end: '18:00',
    days: [1, 2, 3, 4, 5],
    timezone: 'America/Sao_Paulo'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const callbackUrl = 'https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/n8n-send-message';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load all N8N settings at once
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['n8n_webhook_url', 'n8n_api_key', 'n8n_force_ai_mode', 'business_hours']);

      settings?.forEach((setting) => {
        const raw = setting.setting_value as any;
        switch (setting.setting_key) {
          case 'n8n_webhook_url':
            // Handle both wrapped {value: "..."} and plain string formats
            const url = raw?.value ?? (typeof raw === 'string' ? raw : '');
            setWebhookUrl(url.replace(/^"|"$/g, ''));
            break;
          case 'n8n_api_key':
            const key = raw?.value ?? (typeof raw === 'string' ? raw : '');
            setApiKey(key.replace(/^"|"$/g, ''));
            break;
          case 'n8n_force_ai_mode':
            // Handle both wrapped {value: bool} and plain boolean
            setForceAIMode(raw?.value === true || raw === true);
            break;
          case 'business_hours':
            if (raw && typeof raw === 'object' && !raw.value) {
              setBusinessHours(raw as BusinessHours);
            } else if (raw?.value && typeof raw.value === 'object') {
              setBusinessHours(raw.value as BusinessHours);
            }
            break;
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Prepare settings with proper JSON-safe values
      // Strings wrapped in objects, empty strings as null
      const settingsToSave = [
        { 
          setting_key: 'n8n_webhook_url', 
          setting_category: 'n8n', 
          setting_value: webhookUrl?.trim() ? { value: webhookUrl.trim() } : null 
        },
        { 
          setting_key: 'n8n_api_key', 
          setting_category: 'n8n', 
          setting_value: apiKey?.trim() ? { value: apiKey.trim() } : null 
        },
        { 
          setting_key: 'n8n_force_ai_mode', 
          setting_category: 'n8n', 
          setting_value: { value: forceAIMode } 
        },
        { 
          setting_key: 'business_hours', 
          setting_category: 'n8n', 
          setting_value: businessHours 
        },
      ];

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: setting.setting_key,
            setting_category: setting.setting_category,
            setting_value: setting.setting_value as any,
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' });

        if (error) {
          console.error(`Error saving ${setting.setting_key}:`, error);
          throw error;
        }
      }

      console.log('✅ Settings saved:', { webhookUrl, apiKey: apiKey ? '***' : '', forceAIMode });
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'n8n_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiKey(result);
    toast.success('Nova API key gerada! Lembre-se de salvar.');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error('Configure a URL do webhook primeiro');
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('n8n-trigger', {
        body: {
          phoneNumber: '5500000000000',
          messageBody: 'Teste de conexão N8N',
          messageType: 'test',
          contactName: 'Teste Sistema',
          contactType: null
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Webhook N8N funcionando corretamente!');
      } else {
        toast.error(`Erro no webhook: ${data?.error || 'Resposta inválida'}`);
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Erro ao testar webhook');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleDay = (day: number) => {
    setBusinessHours(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  };

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Agente Virtual N8N</CardTitle>
          </div>
          <CardDescription>
            Configure a integração com o N8N para atendimento automatizado fora do horário comercial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL do Webhook N8N</Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://seu-n8n.com/webhook/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={testWebhook}
                disabled={isTesting || !webhookUrl}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Testando...' : 'Testar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure um workflow N8N com trigger de webhook para receber mensagens
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key para N8N</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Clique em 'Gerar' para criar uma chave"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" onClick={generateApiKey}>
                <Key className="h-4 w-4 mr-2" />
                Gerar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(apiKey, 'API Key')}
                disabled={!apiKey}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta chave no HTTP Request do N8N para autenticar
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>URL de Callback (para N8N)</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={callbackUrl}
                readOnly
                className="bg-muted/50"
              />
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(callbackUrl, 'Callback URL')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure esta URL no nó HTTP Request do N8N para enviar respostas
            </p>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Precisa de ajuda? 
              <a 
                href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
              >
                Documentação N8N Webhook
              </a>
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Horário Comercial</CardTitle>
          </div>
          <CardDescription>
            O agente IA será ativado automaticamente fora deste horário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Início</Label>
              <Input
                id="start-time"
                type="time"
                value={businessHours.start}
                onChange={(e) => setBusinessHours(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Fim</Label>
              <Input
                id="end-time"
                type="time"
                value={businessHours.end}
                onChange={(e) => setBusinessHours(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dias de Atendimento</Label>
            <div className="flex flex-wrap gap-2">
              {dayNames.map((name, index) => (
                <Badge
                  key={index}
                  variant={businessHours.days.includes(index) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleDay(index)}
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <TestTube className="h-4 w-4 text-amber-500" />
                Modo de Teste (Forçar IA)
              </p>
              <p className="text-xs text-muted-foreground">
                Quando ativo, TODAS as mensagens são enviadas para o N8N, ignorando o horário comercial
              </p>
            </div>
            <Switch
              checked={forceAIMode}
              onCheckedChange={setForceAIMode}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Resumo</p>
              <p className="text-xs text-muted-foreground">
                Atendimento humano: {businessHours.start} - {businessHours.end}
                {' '}({dayNames.filter((_, i) => businessHours.days.includes(i)).join(', ')})
              </p>
              <p className="text-xs text-muted-foreground">
                {forceAIMode ? '⚠️ Modo teste ativo - todas as mensagens vão para IA' : 'Agente IA: fora do horário comercial'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
