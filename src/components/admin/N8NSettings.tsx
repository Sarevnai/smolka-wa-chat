import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bot, Clock, Save, TestTube, ExternalLink, Key, Copy, Eye, EyeOff } from 'lucide-react';
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
      // Load N8N webhook URL
      const { data: n8nData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'n8n_webhook_url')
        .single();

      if (n8nData?.setting_value) {
        const url = typeof n8nData.setting_value === 'string' 
          ? n8nData.setting_value 
          : '';
        setWebhookUrl(url.replace(/^"|"$/g, '')); // Remove quotes if present
      }

      // Load API key
      const { data: apiKeyData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'n8n_api_key')
        .single();

      if (apiKeyData?.setting_value) {
        const key = typeof apiKeyData.setting_value === 'string' 
          ? apiKeyData.setting_value 
          : '';
        setApiKey(key.replace(/^"|"$/g, ''));
      }

      // Load business hours
      const { data: hoursData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'business_hours')
        .single();

      if (hoursData?.setting_value) {
        setBusinessHours(hoursData.setting_value as unknown as BusinessHours);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      // Save N8N webhook URL
      const { error: urlError } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'n8n_webhook_url',
          setting_category: 'integrations',
          setting_value: webhookUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (urlError) throw urlError;

      // Save API key
      const { error: apiKeyError } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'n8n_api_key',
          setting_category: 'integrations',
          setting_value: apiKey,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (apiKeyError) throw apiKeyError;

      // Save business hours
      const { error: hoursError } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'business_hours',
          setting_category: 'business',
          setting_value: businessHours as any,
          updated_at: new Date().toISOString()
        }, { onConflict: 'setting_key' });

      if (hoursError) throw hoursError;

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

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Resumo</p>
              <p className="text-xs text-muted-foreground">
                Atendimento humano: {businessHours.start} - {businessHours.end}
                {' '}({dayNames.filter((_, i) => businessHours.days.includes(i)).join(', ')})
              </p>
              <p className="text-xs text-muted-foreground">
                Agente IA: fora deste horário
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
