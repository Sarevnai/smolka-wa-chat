import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Settings, Bell, Shield, Database } from 'lucide-react';
import { useSystemSettings } from '@/hooks/admin/useSystemSettings';
import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

export default function SystemSettings() {
  const { settings, loading, updateSetting, getSetting } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings.length > 0) {
      const settingsMap: Record<string, any> = {};
      settings.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      setLocalSettings(settingsMap);
    }
  }, [settings]);

  const handleSave = async () => {
    for (const key in localSettings) {
      if (localSettings[key] !== getSetting(key)) {
        await updateSetting(key, localSettings[key]);
      }
    }
    setHasChanges(false);
  };

  const updateLocalSetting = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações gerais da plataforma
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Configurações básicas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input 
              id="company-name" 
              value={localSettings.company_name || ''}
              onChange={(e) => updateLocalSetting('company_name', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Select 
              value={localSettings.timezone || 'America/Sao_Paulo'}
              onValueChange={(value) => updateLocalSetting('timezone', value)}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Sao_Paulo">América/São Paulo (UTC-3)</SelectItem>
                <SelectItem value="America/New_York">América/Nova York (UTC-5)</SelectItem>
                <SelectItem value="Europe/London">Europa/Londres (UTC+0)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure as notificações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações importantes por email
              </p>
            </div>
            <Switch 
              checked={localSettings.email_notifications || false}
              onCheckedChange={(checked) => updateLocalSetting('email_notifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações push no navegador
              </p>
            </div>
            <Switch 
              checked={localSettings.push_notifications || false}
              onCheckedChange={(checked) => updateLocalSetting('push_notifications', checked)}
            />
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Configurações de segurança e autenticação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session-timeout">Timeout da Sessão (minutos)</Label>
            <Input 
              id="session-timeout" 
              type="number" 
              value={localSettings.session_timeout || 30}
              onChange={(e) => updateLocalSetting('session_timeout', parseInt(e.target.value))}
              min="5"
              max="120"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exigir Senha Forte</Label>
              <p className="text-sm text-muted-foreground">
                Obrigar usuários a usar senhas fortes
              </p>
            </div>
            <Switch 
              checked={localSettings.require_strong_password || false}
              onCheckedChange={(checked) => updateLocalSetting('require_strong_password', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Autenticação de Dois Fatores</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar 2FA para todos os usuários
              </p>
            </div>
            <Switch 
              checked={localSettings.enable_2fa || false}
              onCheckedChange={(checked) => updateLocalSetting('enable_2fa', checked)}
            />
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="backup" className="mt-6">
      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup
          </CardTitle>
          <CardDescription>
            Configurações de backup automático
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Backup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Realizar backup automático do banco de dados
              </p>
            </div>
            <Switch 
              checked={localSettings.auto_backup || false}
              onCheckedChange={(checked) => updateLocalSetting('auto_backup', checked)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="backup-frequency">Frequência do Backup</Label>
            <Select 
              value={localSettings.backup_frequency || 'daily'}
              onValueChange={(value) => updateLocalSetting('backup_frequency', value)}
            >
              <SelectTrigger id="backup-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">A cada hora</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button variant="outline" className="w-full">
            <Database className="h-4 w-4 mr-2" />
            Realizar Backup Agora
          </Button>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
      </div>
    </Layout>
  );
}
