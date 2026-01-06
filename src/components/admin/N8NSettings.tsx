import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, Save, TestTube, ExternalLink, Key, Copy, Eye, EyeOff, Sparkles, Workflow, Settings2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIAgentSettings } from './AIAgentSettings';

type AgentMode = 'native' | 'n8n';

export function N8NSettings() {
  const [agentMode, setAgentMode] = useState<AgentMode>('native');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const callbackUrl = 'https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/n8n-send-message';

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['n8n_webhook_url', 'n8n_api_key', 'ai_agent_mode']);

      settings?.forEach((setting) => {
        const raw = setting.setting_value as any;
        switch (setting.setting_key) {
          case 'ai_agent_mode':
            const mode = raw?.value ?? raw ?? 'native';
            setAgentMode(mode as AgentMode);
            break;
          case 'n8n_webhook_url':
            const url = raw?.value ?? (typeof raw === 'string' ? raw : '');
            setWebhookUrl(url.replace(/^"|"$/g, ''));
            break;
          case 'n8n_api_key':
            const key = raw?.value ?? (typeof raw === 'string' ? raw : '');
            setApiKey(key.replace(/^"|"$/g, ''));
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
      const settingsToSave = [
        { setting_key: 'ai_agent_mode', setting_category: 'n8n', setting_value: { value: agentMode } },
        { setting_key: 'n8n_webhook_url', setting_category: 'n8n', setting_value: webhookUrl?.trim() ? { value: webhookUrl.trim() } : null },
        { setting_key: 'n8n_api_key', setting_category: 'n8n', setting_value: apiKey?.trim() ? { value: apiKey.trim() } : null },
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

        if (error) throw error;
      }

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

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="settings" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Configurações
        </TabsTrigger>
        <TabsTrigger value="agent" className="gap-2">
          <Bot className="h-4 w-4" />
          Personalidade do Agente
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="settings" className="space-y-6">
      {/* Agent Mode Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Modo do Agente Virtual</CardTitle>
          </div>
          <CardDescription>
            Escolha como o agente virtual irá processar as mensagens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={agentMode}
            onValueChange={(value) => setAgentMode(value as AgentMode)}
            className="space-y-4"
          >
            <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${agentMode === 'native' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="native" id="native" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="native" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium">Agente Nativo (Lovable AI)</span>
                  <Badge variant="secondary" className="ml-2">Recomendado</Badge>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Usa IA integrada diretamente no Supabase. Mais rápido, confiável e sem dependências externas.
                </p>
              </div>
            </div>
            
            <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${agentMode === 'n8n' ? 'border-primary bg-primary/5' : 'border-border'}`}>
              <RadioGroupItem value="n8n" id="n8n" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="n8n" className="flex items-center gap-2 cursor-pointer">
                  <Workflow className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">N8N Externo</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Usa workflow N8N customizado. Requer configuração adicional e manutenção de tokens.
                </p>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* N8N Configuration - only show if N8N mode selected */}
      {agentMode === 'n8n' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-orange-500" />
              <CardTitle>Configuração N8N</CardTitle>
            </div>
            <CardDescription>
              Configure a integração com o N8N para atendimento automatizado
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
                <Button variant="outline" onClick={testWebhook} disabled={isTesting || !webhookUrl}>
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTesting ? 'Testando...' : 'Testar'}
                </Button>
              </div>
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
                <Button variant="outline" onClick={() => copyToClipboard(apiKey, 'API Key')} disabled={!apiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>URL de Callback (para N8N)</Label>
              <div className="flex gap-2">
                <Input type="text" value={callbackUrl} readOnly className="bg-muted/50" />
                <Button variant="outline" onClick={() => copyToClipboard(callbackUrl, 'Callback URL')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Documentação N8N Webhook
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card - Redirect to Agent Config for Schedule */}
      <Card className="border-dashed">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground text-center">
            💡 Os horários de automação da IA são configurados na aba <strong>"Personalidade do Agente"</strong> → seção "Horários de Automação"
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
      </TabsContent>
      
      <TabsContent value="agent">
        <AIAgentSettings />
      </TabsContent>
    </Tabs>
  );
}
