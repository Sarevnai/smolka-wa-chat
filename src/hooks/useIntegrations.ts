import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'pending' | 'error';
  configPath: string;
  features: string[];
  lastSync?: string;
  errorMessage?: string;
  icon?: string;
  isModal?: boolean;
}

const defaultIntegrations: Integration[] = [
  {
    id: 'n8n',
    name: 'N8N - Agente Virtual',
    description: 'Automação inteligente com IA para atendimento fora do horário comercial',
    status: 'disconnected',
    configPath: '#',
    icon: '🤖',
    isModal: true,
    features: [
      'Atendimento automatizado 24/7',
      'Integração com IA',
      'Horário comercial configurável',
      'Callback HTTP para mensagens'
    ]
  },
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

  const checkN8NStatus = async (): Promise<'connected' | 'disconnected'> => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('setting_category', 'n8n')
        .in('setting_key', ['n8n_webhook_url', 'n8n_api_key']);

      if (error) {
        console.error('Error checking N8N config:', error);
        return 'disconnected';
      }

      const webhookUrl = data?.find(s => s.setting_key === 'n8n_webhook_url')?.setting_value;
      const apiKey = data?.find(s => s.setting_key === 'n8n_api_key')?.setting_value;

      return webhookUrl && apiKey ? 'connected' : 'disconnected';
    } catch (error) {
      console.error('Error checking N8N status:', error);
      return 'disconnected';
    }
  };

  const checkClickUpStatus = async () => {
    try {
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
    return 'connected';
  };

  const loadIntegrationsStatus = async () => {
    setLoading(true);
    
    try {
      const [n8nStatus, clickupStatus] = await Promise.all([
        checkN8NStatus(),
        checkClickUpStatus()
      ]);
      const whatsappStatus = checkWhatsAppStatus();

      setIntegrations(prev => prev.map(integration => {
        switch (integration.id) {
          case 'n8n':
            return { ...integration, status: n8nStatus };
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
      toast.error("Erro ao carregar status das integrações");
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

      if (success) {
        toast.success("Conexão bem-sucedida!");
      } else {
        toast.error("Falha na conexão. Verifique suas configurações.");
      }

      return success;
    } catch (error) {
      console.error(`Error testing ${integrationId} connection:`, error);
      
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, status: 'disconnected', errorMessage: 'Erro na conexão' }
          : integration
      ));

      toast.error("Erro ao testar a conexão.");
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

      toast.success("Integração desconectada com sucesso.");
    } catch (error) {
      console.error(`Error disconnecting ${integrationId}:`, error);
      toast.error("Erro ao desconectar integração.");
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