import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";

export interface DepartmentMetrics {
  department: string;
  label: string;
  color: string;
  icon: string;
  totalContacts: number;
  activeConversations: number;
  messagesToday: number;
  messagesWeek: number;
  pipelineStages: Record<string, number>;
}

export interface PortalLeadsStats {
  total: number;
  byPortal: Record<string, number>;
  todayCount: number;
  weekCount: number;
}

export interface TrendData {
  date: string;
  locacao: number;
  vendas: number;
  administrativo: number;
  marketing: number;
}

export interface ManagementStats {
  totalMessages: number;
  totalContacts: number;
  totalConversations: number;
  activeCampaigns: number;
  openTickets: number;
  totalUsers: number;
  departments: DepartmentMetrics[];
  portalLeads: PortalLeadsStats;
  trends: TrendData[];
}

const DEPARTMENT_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  locacao: { label: 'Locação', color: 'bg-blue-500', icon: '🏠' },
  vendas: { label: 'Vendas', color: 'bg-green-500', icon: '💰' },
  administrativo: { label: 'Administrativo', color: 'bg-slate-500', icon: '🏢' },
  marketing: { label: 'Marketing', color: 'bg-pink-500', icon: '📢' }
};

export function useManagementStats() {
  return useQuery({
    queryKey: ['management-stats'],
    queryFn: async (): Promise<ManagementStats> => {
      const today = startOfDay(new Date());
      const weekAgo = subDays(today, 7);
      
      // Parallel queries for all stats
      const [
        messagesResult,
        contactsResult,
        conversationsResult,
        campaignsResult,
        ticketsResult,
        usersResult,
        contactsByDeptResult,
        conversationsByDeptResult,
        messagesTodayByDeptResult,
        messagesWeekByDeptResult,
        portalLeadsResult,
        portalLeadsTodayResult,
        portalLeadsWeekResult,
        pipelineStagesResult,
        trendDataResult
      ] = await Promise.all([
        // Total messages
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        // Total contacts
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        // Total conversations
        supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        // Active campaigns
        supabase.from('campaigns').select('id', { count: 'exact', head: true }).in('status', ['sending', 'scheduled']),
        // Open tickets
        supabase.from('tickets').select('id', { count: 'exact', head: true }).neq('stage', 'resolvido'),
        // Total users
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // Contacts by department
        supabase.from('contacts').select('department_code'),
        // Active conversations by department
        supabase.from('conversations').select('department_code').eq('status', 'active'),
        // Messages today by department (via conversation join)
        supabase.from('messages').select('conversation_id, conversations!inner(department_code)')
          .gte('created_at', today.toISOString()),
        // Messages this week by department
        supabase.from('messages').select('conversation_id, conversations!inner(department_code)')
          .gte('created_at', weekAgo.toISOString()),
        // Portal leads total
        supabase.from('portal_leads_log').select('portal_origin'),
        // Portal leads today
        supabase.from('portal_leads_log').select('id', { count: 'exact', head: true })
          .gte('created_at', today.toISOString()),
        // Portal leads this week
        supabase.from('portal_leads_log').select('id', { count: 'exact', head: true })
          .gte('created_at', weekAgo.toISOString()),
        // Conversation stages for pipeline
        supabase.from('conversations').select('department_code, stage_id, conversation_stages!inner(name)'),
        // Trend data - messages per day per department for last 7 days
        supabase.from('messages').select('created_at, conversations!inner(department_code)')
          .gte('created_at', weekAgo.toISOString())
      ]);

      // Process contacts by department
      const contactsByDept: Record<string, number> = {};
      contactsByDeptResult.data?.forEach((c: { department_code: string | null }) => {
        const dept = c.department_code || 'unknown';
        contactsByDept[dept] = (contactsByDept[dept] || 0) + 1;
      });

      // Process conversations by department
      const convsByDept: Record<string, number> = {};
      conversationsByDeptResult.data?.forEach((c: { department_code: string | null }) => {
        const dept = c.department_code || 'unknown';
        convsByDept[dept] = (convsByDept[dept] || 0) + 1;
      });

      // Process messages today by department
      const msgsTodayByDept: Record<string, number> = {};
      messagesTodayByDeptResult.data?.forEach((m: { conversations: { department_code: string | null } }) => {
        const dept = m.conversations?.department_code || 'unknown';
        msgsTodayByDept[dept] = (msgsTodayByDept[dept] || 0) + 1;
      });

      // Process messages this week by department
      const msgsWeekByDept: Record<string, number> = {};
      messagesWeekByDeptResult.data?.forEach((m: { conversations: { department_code: string | null } }) => {
        const dept = m.conversations?.department_code || 'unknown';
        msgsWeekByDept[dept] = (msgsWeekByDept[dept] || 0) + 1;
      });

      // Process pipeline stages by department
      const pipelineByDept: Record<string, Record<string, number>> = {};
      pipelineStagesResult.data?.forEach((c: { department_code: string | null; conversation_stages: { name: string } }) => {
        const dept = c.department_code || 'unknown';
        const stageName = c.conversation_stages?.name || 'Sem estágio';
        if (!pipelineByDept[dept]) pipelineByDept[dept] = {};
        pipelineByDept[dept][stageName] = (pipelineByDept[dept][stageName] || 0) + 1;
      });

      // Build department metrics
      const departments: DepartmentMetrics[] = Object.entries(DEPARTMENT_CONFIG).map(([code, config]) => ({
        department: code,
        label: config.label,
        color: config.color,
        icon: config.icon,
        totalContacts: contactsByDept[code] || 0,
        activeConversations: convsByDept[code] || 0,
        messagesToday: msgsTodayByDept[code] || 0,
        messagesWeek: msgsWeekByDept[code] || 0,
        pipelineStages: pipelineByDept[code] || {}
      }));

      // Process portal leads by origin
      const leadsByPortal: Record<string, number> = {};
      portalLeadsResult.data?.forEach((l: { portal_origin: string }) => {
        leadsByPortal[l.portal_origin] = (leadsByPortal[l.portal_origin] || 0) + 1;
      });

      // Process trend data
      const trendMap: Record<string, Record<string, number>> = {};
      trendDataResult.data?.forEach((m: { created_at: string; conversations: { department_code: string | null } }) => {
        const date = format(new Date(m.created_at), 'yyyy-MM-dd');
        const dept = m.conversations?.department_code || 'unknown';
        if (!trendMap[date]) trendMap[date] = { locacao: 0, vendas: 0, administrativo: 0, marketing: 0 };
        if (dept in trendMap[date]) {
          trendMap[date][dept as keyof typeof trendMap[typeof date]]++;
        }
      });

      // Convert trend map to array sorted by date
      const trends: TrendData[] = Object.entries(trendMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, values]) => ({
          date: format(new Date(date), 'dd/MM'),
          locacao: values.locacao || 0,
          vendas: values.vendas || 0,
          administrativo: values.administrativo || 0,
          marketing: values.marketing || 0
        }));

      return {
        totalMessages: messagesResult.count || 0,
        totalContacts: contactsResult.count || 0,
        totalConversations: conversationsResult.count || 0,
        activeCampaigns: campaignsResult.count || 0,
        openTickets: ticketsResult.count || 0,
        totalUsers: usersResult.count || 0,
        departments,
        portalLeads: {
          total: portalLeadsResult.data?.length || 0,
          byPortal: leadsByPortal,
          todayCount: portalLeadsTodayResult.count || 0,
          weekCount: portalLeadsWeekResult.count || 0
        },
        trends
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000 // Auto-refresh every 5 minutes
  });
}
