import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { PortalLead } from '@/types/ai-behavior';

export interface LeadsFilters {
  channel?: string;
  aiAttended?: boolean | null;
  transactionType?: string;
  crmStatus?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export function useLeads(filters: LeadsFilters, page: number = 1, pageSize: number = 10) {
  return useQuery({
    queryKey: ['portal-leads', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('portal_leads_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters.channel) {
        query = query.eq('portal_origin', filters.channel);
      }
      if (filters.aiAttended !== null && filters.aiAttended !== undefined) {
        query = query.eq('ai_attended', filters.aiAttended);
      }
      if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType);
      }
      if (filters.crmStatus) {
        query = query.eq('crm_status', filters.crmStatus);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }
      if (filters.search) {
        query = query.or(`contact_name.ilike.%${filters.search}%,contact_phone.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        leads: data as PortalLead[],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });
}

export function useLeadChannels() {
  return useQuery({
    queryKey: ['lead-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('portal_origin')
        .not('portal_origin', 'is', null);

      if (error) throw error;

      const channels = [...new Set(data?.map(d => d.portal_origin))];
      return channels.filter(Boolean) as string[];
    },
  });
}

export function useExportLeads() {
  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('*')
        .in('id', leadIds);

      if (error) throw error;

      // Convert to CSV
      const headers = ['Nome', 'Telefone', 'Email', 'Canal', 'Operação', 'Data', 'Status IA', 'Status CRM'];
      const rows = data?.map(lead => [
        lead.contact_name || '',
        lead.contact_phone || '',
        lead.contact_email || '',
        lead.portal_origin || '',
        lead.transaction_type || '',
        lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '',
        lead.ai_attended ? 'Atendido' : 'Não atendido',
        lead.crm_status || 'Não pronto',
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      return data;
    },
    onSuccess: () => {
      toast.success('Leads exportados com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao exportar leads');
    },
  });
}

export function useSendToCRM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      // Update CRM status to 'sent'
      const { error } = await supabase
        .from('portal_leads_log')
        .update({ 
          crm_status: 'sent',
          crm_sent_at: new Date().toISOString(),
        })
        .in('id', leadIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-leads'] });
      toast.success('Leads enviados ao CRM!');
    },
    onError: () => {
      toast.error('Erro ao enviar leads ao CRM');
    },
  });
}

export function useScheduleRemarketing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      // For now, just mark as scheduled for remarketing
      const { error } = await supabase
        .from('portal_leads_log')
        .update({ 
          status: 'remarketing_scheduled',
        })
        .in('id', leadIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-leads'] });
      toast.success('Remarketing agendado para os leads selecionados!');
    },
    onError: () => {
      toast.error('Erro ao agendar remarketing');
    },
  });
}
