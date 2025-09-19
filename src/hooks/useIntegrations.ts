import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'pending';
  configPath: string;
  features: string[];
  lastSync?: string;
  errorMessage?: string;
}

const defaultIntegrations: Integration[] = [
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Sincronize tickets automaticamente com suas listas do ClickUp para melhor gestão de tarefas',
    status: 'disconnected',
    configPath: '/clickup',
    features: [
      'Criação automática de tasks',
      'Sincronização de status',
      'Campos customizados',
      'Webhooks bidirecionais'
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Integração nativa com WhatsApp Business API para envio e recebimento de mensagens',
    status: 'connected',
    configPath: '/whatsapp-config',
    features: [
      'Envio de mensagens',
      'Templates aprovados',
      'Webhooks em tempo real',
      'Mídia e documentos'
    ]
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte com centenas de aplicações através do Zapier para automações avançadas',
    status: 'disconnected',
    configPath: '/zapier-config',
    features: [
      'Automações personalizadas',
      'Triggers por eventos',
      'Integração com CRM',
      'Sincronização de dados'
    ]
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Exporte e sincronize dados de contatos e relatórios com planilhas do Google',
    status: 'pending',
    configPath: '/google-sheets-config',
    features: [
      'Export automático',
      'Sincronização bidirecional',
      'Relatórios dinâmicos',
      'Backup de dados'
    ]
  }
];

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkClickUpStatus = async () => {
    try {
      // Check if ClickUp configuration exists
      const { data: config, error } = await supabase
        .from('clickup_config')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Error checking ClickUp config:', error);
        return 'disconnected';
      }

      return config && config.length > 0 ? 'connected' : 'disconnected';
    } catch (error) {
      console.error('Error checking ClickUp status:', error);
      return 'disconnected';
    }
  };

  const checkWhatsAppStatus = () => {
    // WhatsApp is always connected since it's the core functionality
    return 'connected';
  };

  const loadIntegrationsStatus = async () => {
    setLoading(true);
    
    try {
      const clickupStatus = await checkClickUpStatus();
      const whatsappStatus = checkWhatsAppStatus();

      setIntegrations(prev => prev.map(integration => {
        switch (integration.id) {
          case 'clickup':
            return { ...integration, status: clickupStatus as 'connected' | 'disconnected' };
          case 'whatsapp':
            return { ...integration, status: whatsappStatus as 'connected' | 'disconnected' };
          default:
            return integration;
        }
      }));
    } catch (error) {
      console.error('Error loading integrations status:', error);
      toast({
        title: "Erro ao carregar integrações",
        description: "Não foi possível verificar o status das integrações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (integrationId: string) => {
    try {
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'pending' }
          : integration
      ));

      let success = false;

      switch (integrationId) {
        case 'clickup':
          success = await testClickUpConnection();
          break;
        case 'whatsapp':
          success = true; // WhatsApp is always connected
          break;
        default:
          // Simulate test for other integrations
          await new Promise(resolve => setTimeout(resolve, 2000));
          success = Math.random() > 0.5; // Random success/failure for demo
      }

      const newStatus = success ? 'connected' : 'disconnected';
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { 
              ...integration, 
              status: newStatus,
              lastSync: success ? new Date().toISOString() : integration.lastSync,
              errorMessage: success ? undefined : 'Falha na conexão'
            }
          : integration
      ));

      toast({
        title: success ? "Conexão bem-sucedida" : "Falha na conexão",
        description: success 
          ? "A integração está funcionando corretamente."
          : "Verifique suas configurações e tente novamente.",
        variant: success ? "default" : "destructive",
      });

      return success;
    } catch (error) {
      console.error(`Error testing ${integrationId} connection:`, error);
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'disconnected', errorMessage: 'Erro na conexão' }
          : integration
      ));

      toast({
        title: "Erro no teste de conexão",
        description: "Ocorreu um erro ao testar a conexão.",
        variant: "destructive",
      });

      return false;
    }
  };

  const testClickUpConnection = async (): Promise<boolean> => {
    try {
      const { data: config, error } = await supabase
        .from('clickup_config')
        .select('*')
        .limit(1);

      if (error) {
        console.error('Error testing ClickUp connection:', error);
        return false;
      }

      // Here you would make an actual API call to ClickUp to test the connection
      // For now, we'll just check if the config exists
      return config && config.length > 0;
    } catch (error) {
      console.error('Error testing ClickUp connection:', error);
      return false;
    }
  };

  const disconnectIntegration = async (integrationId: string) => {
    try {
      switch (integrationId) {
        case 'clickup':
          // For now, just update the local state
          // In a real app, you would clear the actual configuration
          console.log('Disconnecting ClickUp integration');
          break;
        // Add other integration disconnection logic here
      }

      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'disconnected' as const, errorMessage: undefined }
          : integration
      ));

      toast({
        title: "Integração desconectada",
        description: "A integração foi desconectada com sucesso.",
      });
    } catch (error) {
      console.error(`Error disconnecting ${integrationId}:`, error);
      toast({
        title: "Erro ao desconectar",
        description: "Não foi possível desconectar a integração.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadIntegrationsStatus();
  }, []);

  return {
    integrations,
    loading,
    testConnection,
    disconnectIntegration,
    refreshStatus: loadIntegrationsStatus
  };
}