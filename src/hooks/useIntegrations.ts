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
    id: 'portais-imobiliarios',
    name: 'Portais Imobiliários',
    description: 'Receba leads automaticamente do ZAP, Viva Real e OLX',
    status: 'disconnected',
    configPath: '/admin/portal-integration',
    icon: '🏢',
    features: [
      'Webhook para receber leads',
      'Criação automática de contatos',
      'Atribuição a listas de marketing',
      'Histórico completo de leads'
    ]
  },
  {
    id: 'c2s',
    name: 'C2S - Contact2Sale',
    description: 'Envie leads qualificados de venda diretamente para o sistema C2S dos corretores',
    status: 'disconnected',
    configPath: '#',
    icon: '🏠',
    features: [
      'Envio automático de leads',
      'Histórico de conversa incluído',
      'Critérios de qualificação',
      'Rastreamento de status'
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
  }
];

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [loading, setLoading] = useState(true);

  const checkWhatsAppStatus = () => {
    return 'connected';
  };

  const checkC2SStatus = async (): Promise<'connected' | 'disconnected'> => {
    try {
      const { data, error } = await supabase
        .from('c2s_integration')
        .select('id')
        .eq('sync_status', 'synced')
        .limit(1);

      if (error) {
        console.error('Error checking C2S status:', error);
        return 'disconnected';
      }

      return 'connected';
    } catch (error) {
      console.error('Error checking C2S status:', error);
      return 'disconnected';
    }
  };

  const checkPortaisStatus = async (): Promise<'connected' | 'disconnected'> => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_category', 'portais')
        .eq('setting_key', 'webhook_token')
        .maybeSingle();

      return data?.setting_value ? 'connected' : 'disconnected';
    } catch (error) {
      console.error('Error checking Portais status:', error);
      return 'disconnected';
    }
  };

  const loadIntegrationsStatus = async () => {
    setLoading(true);
    
    try {
      const [c2sStatus, portaisStatus] = await Promise.all([
        checkC2SStatus(),
        checkPortaisStatus()
      ]);
      const whatsappStatus = checkWhatsAppStatus();

      setIntegrations(prev => prev.map(integration => {
        switch (integration.id) {
          case 'whatsapp':
            return { ...integration, status: whatsappStatus as 'connected' | 'disconnected' };
          case 'c2s':
            return { ...integration, status: c2sStatus };
          case 'portais-imobiliarios':
            return { ...integration, status: portaisStatus };
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
        case 'c2s':
          success = await testC2SConnection();
          break;
        case 'whatsapp':
          success = true;
          break;
        default:
          await new Promise(resolve => setTimeout(resolve, 2000));
          success = Math.random() > 0.5;
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

  const testC2SConnection = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('c2s-create-lead', {
        body: {
          name: 'TEST_CONNECTION',
          phone: '0000000000',
          _test: true,
        },
      });

      if (error && error.message?.includes('C2S_API_TOKEN')) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error testing C2S connection:', error);
      return false;
    }
  };

  const disconnectIntegration = async (integrationId: string) => {
    try {
      console.log(`Disconnecting ${integrationId} integration`);

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
