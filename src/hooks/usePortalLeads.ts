import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PortalLeadLog {
  id: string;
  created_at: string;
  portal_origin: string;
  origin_lead_id: string | null;
  origin_listing_id: string | null;
  client_listing_id: string | null;
  contact_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  message: string | null;
  temperature: string | null;
  transaction_type: string | null;
  raw_payload: Record<string, unknown> | null;
  processed_at: string | null;
  status: string;
  error_message: string | null;
}

export interface PortalConfig {
  webhook_token: string;
  default_list_id: string;
  auto_create_conversation: boolean;
  send_welcome_message: boolean;
  sell_department: string;
  rent_department: string;
}

export interface PortalStats {
  total: number;
  byPortal: Record<string, number>;
  today: number;
  thisWeek: number;
  processed: number;
  errors: number;
}

export function usePortalLeadsLog(limit = 50) {
  return useQuery({
    queryKey: ['portal-leads-log', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as PortalLeadLog[];
    }
  });
}

export function usePortalLeadsStats() {
  return useQuery({
    queryKey: ['portal-leads-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('portal_origin, created_at, status');

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const stats: PortalStats = {
        total: data?.length || 0,
        byPortal: {},
        today: 0,
        thisWeek: 0,
        processed: 0,
        errors: 0
      };

      data?.forEach(lead => {
        // Por portal
        const portal = lead.portal_origin || 'unknown';
        stats.byPortal[portal] = (stats.byPortal[portal] || 0) + 1;

        // Por data
        const createdAt = new Date(lead.created_at);
        if (createdAt >= todayStart) stats.today++;
        if (createdAt >= weekStart) stats.thisWeek++;

        // Por status
        if (lead.status === 'processed') stats.processed++;
        if (lead.status === 'error') stats.errors++;
      });

      return stats;
    }
  });
}

export function usePortalConfig() {
  return useQuery({
    queryKey: ['portal-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('setting_category', 'portais');

      if (error) throw error;

      const config: Partial<PortalConfig> = {};
      data?.forEach(setting => {
        const key = setting.setting_key as keyof PortalConfig;
        const value = setting.setting_value;
        
        if (key === 'auto_create_conversation' || key === 'send_welcome_message') {
          config[key] = value === 'true' || value === true;
        } else {
          (config as Record<string, unknown>)[key] = value;
        }
      });

      return config as Partial<PortalConfig>;
    }
  });
}

export function useSavePortalConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: Partial<PortalConfig>) => {
      const settings = Object.entries(config).map(([key, value]) => ({
        setting_category: 'portais',
        setting_key: key,
        setting_value: typeof value === 'boolean' ? String(value) : value,
        description: getSettingDescription(key)
      }));

      for (const setting of settings) {
        const { error } = await supabase
          .from('system_settings')
          .upsert(setting, {
            onConflict: 'setting_category,setting_key'
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-config'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    }
  });
}

export function useGenerateToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const token = crypto.randomUUID().replace(/-/g, '');
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_category: 'portais',
          setting_key: 'webhook_token',
          setting_value: token,
          description: 'Token de autenticação para webhook dos portais imobiliários'
        }, {
          onConflict: 'setting_category,setting_key'
        });

      if (error) throw error;
      return token;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-config'] });
      toast.success('Novo token gerado com sucesso!');
    },
    onError: (error) => {
      console.error('Error generating token:', error);
      toast.error('Erro ao gerar token');
    }
  });
}

function getSettingDescription(key: string): string {
  const descriptions: Record<string, string> = {
    webhook_token: 'Token de autenticação para webhook dos portais imobiliários',
    default_list_id: 'ID da lista padrão para novos leads',
    auto_create_conversation: 'Criar conversa automaticamente ao receber lead',
    send_welcome_message: 'Enviar mensagem de boas-vindas ao receber lead',
    sell_department: 'Departamento para leads de venda',
    rent_department: 'Departamento para leads de locação'
  };
  return descriptions[key] || '';
}
