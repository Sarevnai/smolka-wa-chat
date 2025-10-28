import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Bell,
  Shield,
  Database,
  Mail,
  Smartphone,
  Save,
  Info,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SystemSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // General Settings
  const [companyName, setCompanyName] = useState('Smolka WhatsApp Inbox');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('admin@smolka.com.br');

  // Security Settings
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [requireStrongPassword, setRequireStrongPassword] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Backup Settings
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');

  const handleSave = async () => {
    setSaving(true);
    
    // Simular salvamento
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Configurações Salvas',
      description: 'As configurações do sistema foram atualizadas com sucesso.',
    });
    
    setSaving(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações gerais do sistema
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Em Desenvolvimento</AlertTitle>
        <AlertDescription>
          Esta página está em desenvolvimento. As configurações ainda não são persistidas no banco de dados.
        </AlertDescription>
      </Alert>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Informações básicas sobre a empresa e sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Sao_Paulo"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>
            Configure como você deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailNotifications" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Notificações por Email
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber alertas importantes por email
              </p>
            </div>
            <Switch
              id="emailNotifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          {emailNotifications && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="notificationEmail">Email para Notificações</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="admin@smolka.com.br"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="pushNotifications" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Notificações Push
              </Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações no navegador
              </p>
            </div>
            <Switch
              id="pushNotifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
        </CardContent>
      </Card>

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
            <Label htmlFor="sessionTimeout">Tempo de Sessão (minutos)</Label>
            <Input
              id="sessionTimeout"
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground">
              Tempo até o usuário ser desconectado automaticamente
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="requireStrongPassword">Exigir Senha Forte</Label>
              <p className="text-sm text-muted-foreground">
                Mínimo 8 caracteres, letras e números
              </p>
            </div>
            <Switch
              id="requireStrongPassword"
              checked={requireStrongPassword}
              onCheckedChange={setRequireStrongPassword}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="twoFactor">Autenticação de Dois Fatores (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                Aumentar segurança com código adicional
              </p>
            </div>
            <Switch
              id="twoFactor"
              checked={twoFactorEnabled}
              onCheckedChange={setTwoFactorEnabled}
              disabled
            />
          </div>
          {twoFactorEnabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O 2FA será implementado em uma versão futura.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup e Manutenção
          </CardTitle>
          <CardDescription>
            Configure backups automáticos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoBackup">Backup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Realizar backup automático dos dados
              </p>
            </div>
            <Switch
              id="autoBackup"
              checked={autoBackup}
              onCheckedChange={setAutoBackup}
              disabled
            />
          </div>

          {autoBackup && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="backupFrequency">Frequência</Label>
              <Input
                id="backupFrequency"
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
                placeholder="daily"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Opções: daily, weekly, monthly
              </p>
            </div>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O sistema de backup automático será implementado em uma versão futura.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
