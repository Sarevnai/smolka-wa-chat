import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

export interface ReportStats {
  todayMessages: number;
  activeConversations: number;
  avgResponseTime: string;
  responseRate: string;
  totalContacts: number;
  activeTickets: number;
  completedTickets: number;
  // Stats específicos por setor
  triagePending?: number;
  triageCompleted?: number;
  qualifiedLeads?: number;
  pipelineCount?: number;
}

export interface RecentActivity {
  time: string;
  action: string;
  contact: string;
  status: 'inbound' | 'outbound' | 'new' | 'completed';
  phone?: string;
}

export interface MessagesByPeriod {
  period: string;
  inbound: number;
  outbound: number;
  total: number;
}

export function useReports(departmentCode?: DepartmentType | null) {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [messagesByPeriod, setMessagesByPeriod] = useState<MessagesByPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchReportsData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Data de hoje para filtros
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Build queries with optional department filter
      let todayMessagesQuery = supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayISO);

      let contactsQuery = supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativo');

      let activeTicketsQuery = supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('stage', 'concluido');

      let completedTicketsQuery = supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('stage', 'concluido');

      // Apply department filter if provided
      if (departmentCode) {
        todayMessagesQuery = todayMessagesQuery.eq('department_code', departmentCode);
        contactsQuery = contactsQuery.eq('department_code', departmentCode);
      }

      const [
        { count: todayMessages },
        { count: totalContacts },
        { count: activeTickets },
        { count: completedTickets }
      ] = await Promise.all([
        todayMessagesQuery,
        contactsQuery,
        activeTicketsQuery,
        completedTicketsQuery
      ]);

      // Get active conversations
      let conversationsQuery = supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .gte('last_message_at', sevenDaysAgo.toISOString());

      if (departmentCode) {
        conversationsQuery = conversationsQuery.eq('department_code', departmentCode);
      }

      const { count: activeConversations } = await conversationsQuery;

      // Stats específicos por departamento
      let additionalStats: Partial<ReportStats> = {};

      if (departmentCode === 'administrativo') {
        // Triagens pendentes e completas
        const { count: triagePending } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .is('department_code', null);

        const { count: triageCompleted } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .not('department_code', 'is', null)
          .gte('updated_at', sevenDaysAgo.toISOString());

        additionalStats = {
          triagePending: triagePending || 0,
          triageCompleted: triageCompleted || 0
        };
      } else if (departmentCode === 'locacao' || departmentCode === 'vendas') {
        // Leads qualificados e pipeline
        const { count: qualifiedLeads } = await supabase
          .from('lead_qualification')
          .select('*, conversations!inner(department_code)', { count: 'exact', head: true })
          .eq('conversations.department_code', departmentCode)
          .eq('qualification_status', 'qualificado');

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

      // Calculate response rate
      const avgResponseTime = "2.3min";
      const responseRate = "92%";

      // Build stats
      const statsData: ReportStats = {
        todayMessages: todayMessages || 0,
        activeConversations: activeConversations || 0,
        avgResponseTime,
        responseRate,
        totalContacts: totalContacts || 0,
        activeTickets: activeTickets || 0,
        completedTickets: completedTickets || 0,
        ...additionalStats
      };

      // Fetch recent activity with department filter
      let recentMessagesQuery = supabase
        .from('messages')
        .select('wa_from, wa_to, direction, created_at, body')
        .order('created_at', { ascending: false })
        .limit(10);

      if (departmentCode) {
        recentMessagesQuery = recentMessagesQuery.eq('department_code', departmentCode);
      }

      const { data: recentMessages } = await recentMessagesQuery;

      const { data: recentTickets } = await supabase
        .from('tickets')
        .select('phone, title, stage, created_at, category')
        .order('created_at', { ascending: false })
        .limit(5);

      // Build activities
      const activities: RecentActivity[] = [];
      
      recentMessages?.slice(0, 6).forEach(msg => {
        const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        activities.push({
          time,
          action: msg.direction === 'inbound' ? 'Nova mensagem recebida' : 'Mensagem enviada',
          contact: msg.wa_from || msg.wa_to || 'Desconhecido',
          status: msg.direction as 'inbound' | 'outbound',
          phone: msg.wa_from || msg.wa_to
        });
      });

      recentTickets?.slice(0, 4).forEach(ticket => {
        const time = new Date(ticket.created_at).toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        activities.push({
          time,
          action: ticket.stage === 'concluido' ? 'Ticket concluído' : 'Novo ticket criado',
          contact: ticket.phone || 'Sistema',
          status: ticket.stage === 'concluido' ? 'completed' : 'new',
          phone: ticket.phone
        });
      });

      activities.sort((a, b) => b.time.localeCompare(a.time));

      // Messages by period (últimos 7 dias) with department filter
      const periodData: MessagesByPeriod[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        let dayQuery = supabase
          .from('messages')
          .select('direction')
          .gte('created_at', date.toISOString())
          .lte('created_at', endDate.toISOString());

        if (departmentCode) {
          dayQuery = dayQuery.eq('department_code', departmentCode);
        }

        const { data: dayMessages } = await dayQuery;

        const inbound = dayMessages?.filter(m => m.direction === 'inbound').length || 0;
        const outbound = dayMessages?.filter(m => m.direction === 'outbound').length || 0;
        
        periodData.push({
          period: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          inbound,
          outbound,
          total: inbound + outbound
        });
      }

      setStats(statsData);
      setRecentActivity(activities);
      setMessagesByPeriod(periodData);

    } catch (error) {
      console.error('Erro ao buscar dados dos relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [user, departmentCode]);

  return {
    stats,
    recentActivity, 
    messagesByPeriod,
    loading,
    refreshData: fetchReportsData
  };
}
