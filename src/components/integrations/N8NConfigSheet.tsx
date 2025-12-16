import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, RefreshCw, Save, Clock, Key, Link, TestTube, AlertTriangle } from "lucide-react";

interface BusinessHours {
  start: string;
  end: string;
  days: string[];
  timezone: string;
}

interface N8NConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: () => void;
}

export function N8NConfigSheet({ open, onOpenChange, onStatusChange }: N8NConfigSheetProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [forceAIMode, setForceAIMode] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    start: "08:00",
    end: "18:00",
    days: ["seg", "ter", "qua", "qui", "sex"],
    timezone: "America/Sao_Paulo"
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);

  const projectRef = "wpjxsgxxhogzkkuznyke";
  const callbackUrl = `https://${projectRef}.supabase.co/functions/v1/n8n-send-message`;

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["n8n_webhook_url", "n8n_api_key", "n8n_force_ai_mode", "business_hours"]);

      if (error) throw error;

      data?.forEach((setting) => {
        const value = setting.setting_value as any;
        switch (setting.setting_key) {
          case "n8n_webhook_url":
            setWebhookUrl(typeof value === 'string' ? value.replace(/^"|"$/g, '') : "");
            break;
          case "n8n_api_key":
            setApiKey(typeof value === 'string' ? value.replace(/^"|"$/g, '') : "");
            break;
          case "n8n_force_ai_mode":
            setForceAIMode(value === true);
            break;
          case "business_hours":
            if (value && typeof value === 'object') {
              // Convert number days to string days if needed
              const days = value.days?.map((d: number | string) => {
                if (typeof d === 'number') {
                  const dayMap: Record<number, string> = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };
                  return dayMap[d] || '';
                }
                return d;
              }).filter(Boolean);
              setBusinessHours({ ...value, days });
            }
            break;
        }
      });
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Convert string days to number days for consistency with N8NSettings
      const dayMap: Record<string, number> = { 'dom': 0, 'seg': 1, 'ter': 2, 'qua': 3, 'qui': 4, 'sex': 5, 'sab': 6 };
      const numericDays = businessHours.days.map(d => typeof d === 'string' ? dayMap[d] : d).filter(d => d !== undefined);
      
      const settings = [
        { key: "n8n_webhook_url", value: webhookUrl },
        { key: "n8n_api_key", value: apiKey },
        { key: "n8n_force_ai_mode", value: forceAIMode },
        { key: "business_hours", value: { ...businessHours, days: numericDays } }
      ];

      for (const { key, value } of settings) {
        const { error } = await supabase
          .from("system_settings")
          .upsert({
            setting_category: "n8n",
            setting_key: key,
            setting_value: value as any,
            updated_at: new Date().toISOString()
          }, { onConflict: "setting_key" });
        
        if (error) {
          console.error(`Error saving ${key}:`, error);
          throw error;
        }
      }

      console.log('✅ Settings saved:', { webhookUrl, apiKey: apiKey ? '***' : '', forceAIMode });
      toast.success("Configurações salvas com sucesso!");
      onStatusChange?.();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "n8n_";
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setApiKey(key);
    toast.success("Nova API Key gerada! Lembre-se de salvar.");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const testWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Configure a URL do webhook primeiro");
      return;
    }

    setTesting(true);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          test: true,
          message: "Teste de conexão do Lovable",
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast.success("Webhook respondeu com sucesso!");
      } else {
        toast.warning(`Webhook respondeu com status ${response.status}`);
      }
    } catch (error) {
      toast.error("Erro ao conectar com o webhook");
    } finally {
      setTesting(false);
    }
  };

  const toggleDay = (day: string) => {
    setBusinessHours(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const weekDays = [
    { id: "seg", label: "Seg" },
    { id: "ter", label: "Ter" },
    { id: "qua", label: "Qua" },
    { id: "qui", label: "Qui" },
    { id: "sex", label: "Sex" },
    { id: "sab", label: "Sáb" },
    { id: "dom", label: "Dom" }
  ];

  const isConfigured = webhookUrl && apiKey;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            🤖 Configurar N8N
            {isConfigured && (
              <Badge variant="default" className="bg-green-500">Configurado</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Configure a integração com o agente virtual N8N para atendimento automatizado.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Webhook URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link className="h-4 w-4" />
                URL do Webhook N8N
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-n8n.com/webhook/xxx"
              />
              <p className="text-xs text-muted-foreground">
                URL do webhook do N8N que receberá as mensagens fora do horário comercial.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testWebhook}
                disabled={testing || !webhookUrl}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testing ? "Testando..." : "Testar Webhook"}
              </Button>
            </CardContent>
          </Card>

          {/* API Key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Key para N8N
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="n8n_xxxxxxxx"
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" onClick={generateApiKey}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => copyToClipboard(apiKey, "API Key")}
                  disabled={!apiKey}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use esta chave no campo <code className="bg-muted px-1 rounded">api_key</code> do HTTP Request no N8N.
              </p>
            </CardContent>
          </Card>

          {/* Callback URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link className="h-4 w-4" />
                URL de Callback (para N8N enviar respostas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={callbackUrl}
                  readOnly
                  className="font-mono text-xs bg-muted"
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => copyToClipboard(callbackUrl, "URL de Callback")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure o HTTP Request do N8N para enviar respostas para esta URL.
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Force AI Mode */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Modo de Teste (Forçar IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Quando ativo, TODAS as mensagens são enviadas para o N8N, ignorando o horário comercial
                </p>
                <Switch
                  checked={forceAIMode}
                  onCheckedChange={setForceAIMode}
                />
              </div>
              {forceAIMode && (
                <p className="text-xs text-amber-500 font-medium">
                  ⚠️ Ativo - todas as mensagens serão processadas pelo agente virtual
                </p>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Business Hours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Horário Comercial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                O N8N receberá mensagens <strong>fora</strong> deste horário.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Início</Label>
                  <Input
                    type="time"
                    value={businessHours.start}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Fim</Label>
                  <Input
                    type="time"
                    value={businessHours.end}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Dias da Semana</Label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <Button
                      key={day.id}
                      variant={businessHours.days.includes(day.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleDay(day.id)}
                      className="w-12"
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={saveSettings} 
            disabled={loading}
            className="w-full"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
