import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

export interface DashboardStats {
  totalMessages: number;
  messagestoday: number;
  activeConversations: number;
  totalContacts: number;
  campaignsSent: number;
  responseRate: number;
  avgResponseTime: string;
  recentActivity: ActivityItem[];
  // Stats específicos por setor
  qualifiedLeads?: number;
  pipelineCount?: number;
  triagePending?: number;
  activeTickets?: number;
  completedTickets?: number;
  avgResolutionTime?: string;
  triageToLocacao?: number;
  triageToVendas?: number;
  triageToMarketing?: number;
  triageToAdministrativo?: number;
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'campaign' | 'contact' | 'integration';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'error';
}

export function useDashboardStats(departmentCode?: DepartmentType | null) {
  const [stats, setStats] = useState<DashboardStats>({
    totalMessages: 0,
    messagestoday: 0,
    activeConversations: 0,
    totalContacts: 0,
    campaignsSent: 0,
    responseRate: 0,
    avgResponseTime: '0min',
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Build queries based on department filter
      let messagesQuery = supabase.from('messages').select('*', { count: 'exact', head: true });
      let messagesTodayQuery = supabase.from('messages').select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
      let contactsQuery = supabase.from('contacts').select('*', { count: 'exact', head: true });
      let campaignsQuery = supabase.from('campaigns').select('*', { count: 'exact', head: true });

      // Apply department filter if provided
      if (departmentCode) {
        messagesQuery = messagesQuery.eq('department_code', departmentCode);
        messagesTodayQuery = messagesTodayQuery.eq('department_code', departmentCode);
        contactsQuery = contactsQuery.eq('department_code', departmentCode);
        campaignsQuery = campaignsQuery.eq('department_code', departmentCode);
      }

      // Execute queries
      const [
        { count: totalMessages },
        { count: messagestoday },
        { count: totalContacts },
        { count: campaignsSent }
      ] = await Promise.all([
        messagesQuery,
        messagesTodayQuery,
        contactsQuery,
        campaignsQuery
      ]);

      // Get active conversations
      let activeConversationsQuery = supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('last_message_at', sevenDaysAgo.toISOString());

      if (departmentCode) {
        activeConversationsQuery = activeConversationsQuery.eq('department_code', departmentCode);
      }

      const { count: activeConversations } = await activeConversationsQuery;

      // Calculate response rate
      let outboundQuery = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'outbound')
        .gte('created_at', sevenDaysAgo.toISOString());

      let inboundQuery = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .gte('created_at', sevenDaysAgo.toISOString());

      if (departmentCode) {
        outboundQuery = outboundQuery.eq('department_code', departmentCode);
        inboundQuery = inboundQuery.eq('department_code', departmentCode);
      }

      const [{ count: outboundCount }, { count: inboundCount }] = await Promise.all([
        outboundQuery,
        inboundQuery
      ]);

      const responseRate = outboundCount && inboundCount && outboundCount > 0
        ? Math.round((inboundCount / outboundCount) * 100)
        : 0;

      // Stats específicos por departamento
      let additionalStats: Partial<DashboardStats> = {};

      if (departmentCode === 'administrativo') {
        // Triagens pendentes
        const { count: triagePending } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .is('department_code', null);

        // Tickets ativos e concluídos
        const { count: activeTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .neq('stage', 'concluido');

        const { count: completedTickets } = await supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('stage', 'concluido')
          .gte('updated_at', startOfDay.toISOString());

        // Triagens por setor de destino (últimos 7 dias)
        const { data: triageData } = await supabase
          .from('conversations')
          .select('department_code')
          .not('department_code', 'is', null)
          .gte('updated_at', sevenDaysAgo.toISOString());

        const triageCounts = {
          locacao: 0,
          vendas: 0,
          marketing: 0,
          administrativo: 0
        };

        triageData?.forEach(conv => {
          if (conv.department_code && triageCounts[conv.department_code as keyof typeof triageCounts] !== undefined) {
            triageCounts[conv.department_code as keyof typeof triageCounts]++;
          }
        });

        additionalStats = {
          triagePending: triagePending || 0,
          activeTickets: activeTickets || 0,
          completedTickets: completedTickets || 0,
          avgResolutionTime: '15min', // Simplificado por enquanto
          triageToLocacao: triageCounts.locacao,
          triageToVendas: triageCounts.vendas,
          triageToMarketing: triageCounts.marketing,
          triageToAdministrativo: triageCounts.administrativo
        };
      } else if (departmentCode === 'locacao' || departmentCode === 'vendas') {
        // Leads qualificados
        const { count: qualifiedLeads } = await supabase
          .from('lead_qualification')
          .select('*, conversations!inner(department_code)', { count: 'exact', head: true })
          .eq('conversations.department_code', departmentCode)
          .eq('qualification_status', 'qualificado');

        // Pipeline count
        const { count: pipelineCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('department_code', departmentCode)
          .not('stage_id', 'is', null);

        additionalStats = {
          qualifiedLeads: qualifiedLeads || 0,
          pipelineCount: pipelineCount || 0
        };
      }

      // Fetch recent activity
      let recentMessagesQuery = supabase
        .from('messages')
        .select('id, wa_from, media_type, direction, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (departmentCode) {
        recentMessagesQuery = recentMessagesQuery.eq('department_code', departmentCode);
      }

      const { data: recentMessages } = await recentMessagesQuery;

      let recentCampaignsQuery = supabase
        .from('campaigns')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (departmentCode) {
        recentCampaignsQuery = recentCampaignsQuery.eq('department_code', departmentCode);
      }

      const { data: recentCampaigns } = await recentCampaignsQuery;

      let recentContactsQuery = supabase
        .from('contacts')
        .select('id, name, phone, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      if (departmentCode) {
        recentContactsQuery = recentContactsQuery.eq('department_code', departmentCode);
      }

      const { data: recentContacts } = await recentContactsQuery;

      // Build recent activity
      const recentActivity: ActivityItem[] = [
        ...(recentMessages?.map(msg => ({
          id: msg.id.toString(),
          type: 'message' as const,
          title: msg.direction === 'inbound' ? 'Nova mensagem recebida' : 'Mensagem enviada',
          description: `${msg.wa_from} - ${msg.media_type || 'texto'}`,
          timestamp: msg.created_at || new Date().toISOString(),
          status: 'success' as const
        })) || []),
        ...(recentCampaigns?.map(campaign => ({
          id: campaign.id,
          type: 'campaign' as const,
          title: `Campanha: ${campaign.name}`,
          description: `Status: ${campaign.status}`,
          timestamp: campaign.created_at,
          status: campaign.status === 'sent' ? 'success' as const : 
                 campaign.status === 'pending' ? 'pending' as const : 'error' as const
        })) || []),
        ...(recentContacts?.map(contact => ({
          id: contact.id,
          type: 'contact' as const,
          title: 'Novo contato adicionado',
          description: `${contact.name || 'Sem nome'} - ${contact.phone}`,
          timestamp: contact.created_at,
          status: 'success' as const
        })) || [])
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

      setStats({
        totalMessages: totalMessages || 0,
        messagestoday: messagestoday || 0,
        activeConversations: activeConversations || 0,
        totalContacts: totalContacts || 0,
        campaignsSent: campaignsSent || 0,
        responseRate,
        avgResponseTime: '2min',
        recentActivity,
        ...additionalStats
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Não foi possível carregar as estatísticas do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    
    // Refresh stats every 5 minutes
    const interval = setInterval(fetchDashboardStats, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [departmentCode]);

  return {
    stats,
    loading,
    refreshStats: fetchDashboardStats
  };
}
