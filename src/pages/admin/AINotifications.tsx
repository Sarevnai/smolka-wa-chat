import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationSetting {
  id: string;
  type: string;
  name: string;
  description: string;
  enabled: boolean;
  channels: {
    email: boolean;
    whatsapp: boolean;
  };
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export default function AINotifications() {
  const queryClient = useQueryClient();

  // Mock notification settings
  const notificationSettings: NotificationSetting[] = [
    {
      id: 'new_lead',
      type: 'lead',
      name: 'Novo lead',
      description: 'Receba notificações quando um novo lead entrar em contato',
      enabled: true,
      channels: { email: true, whatsapp: false },
    },
    {
      id: 'qualified_lead',
      type: 'lead',
      name: 'Lead qualificado',
      description: 'Receba notificações quando um lead for qualificado pela IA',
      enabled: true,
      channels: { email: true, whatsapp: true },
    },
    {
      id: 'crm_error',
      type: 'error',
      name: 'Erro no envio ao CRM',
      description: 'Receba notificações quando houver erro no envio de leads ao CRM',
      enabled: true,
      channels: { email: true, whatsapp: false },
    },
    {
      id: 'ai_handover',
      type: 'handover',
      name: 'Handover da IA',
      description: 'Receba notificações quando a IA solicitar atendimento humano',
      enabled: true,
      channels: { email: false, whatsapp: true },
    },
    {
      id: 'daily_summary',
      type: 'summary',
      name: 'Resumo diário',
      description: 'Receba um resumo diário dos atendimentos da IA',
      enabled: false,
      channels: { email: true, whatsapp: false },
    },
  ];

  // Mock recent notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['ai-notifications'],
    queryFn: async (): Promise<Notification[]> => {
      // In real implementation, fetch from database
      return [
        {
          id: '1',
          type: 'lead',
          title: 'Novo lead qualificado',
          message: 'João Silva foi qualificado e está pronto para atendimento',
          created_at: new Date().toISOString(),
          read: false,
        },
        {
          id: '2',
          type: 'error',
          title: 'Erro no envio ao CRM',
          message: 'Falha ao enviar lead Maria Souza para o CRM',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          read: false,
        },
        {
          id: '3',
          type: 'handover',
          title: 'Handover solicitado',
          message: 'Lead Pedro Santos solicita atendimento humano',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          read: true,
        },
      ];
    },
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'lead':
        return <Users className="h-4 w-4" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'handover':
        return <MessageSquare className="h-4 w-4" />;
      case 'summary':
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notificações da IA</h1>
            <p className="text-muted-foreground">
              Configure como e quando você deseja ser notificado sobre eventos da IA
            </p>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {notificationSettings.map((setting) => (
              <Card key={setting.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {getNotificationIcon(setting.type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{setting.name}</h3>
                          <Badge variant={setting.enabled ? 'default' : 'secondary'}>
                            {setting.enabled ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{setting.description}</p>
                        
                        {setting.enabled && (
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`${setting.id}-email`}
                                checked={setting.channels.email}
                              />
                              <Label htmlFor={`${setting.id}-email`} className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3" /> Email
                              </Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`${setting.id}-whatsapp`}
                                checked={setting.channels.whatsapp}
                              />
                              <Label htmlFor={`${setting.id}-whatsapp`} className="flex items-center gap-1 text-sm">
                                <MessageSquare className="h-3 w-3" /> WhatsApp
                              </Label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Switch
                      checked={setting.enabled}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Email Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endereços de email</CardTitle>
                <CardDescription>
                  Adicione os emails que devem receber as notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="email@exemplo.com" 
                    className="max-w-sm"
                  />
                  <Button>Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    admin@smolka.com.br
                    <button className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notificações recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))
                ) : notifications?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma notificação recente
                  </p>
                ) : (
                  notifications?.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border ${
                        notification.read ? 'bg-background' : 'bg-muted/50'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        notification.type === 'error' 
                          ? 'bg-destructive/10 text-destructive' 
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{notification.title}</h4>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
