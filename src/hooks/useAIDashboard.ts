import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { 
  LeadStats, 
  LeadsByChannel, 
  LeadsByStatus, 
  LeadsByHour, 
  LeadsByDay,
  LeadsByMonth 
} from '@/types/ai-behavior';

export function useLeadStats(month: Date) {
  return useQuery({
    queryKey: ['lead-stats', format(month, 'yyyy-MM')],
    queryFn: async (): Promise<LeadStats> => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('id, ai_attended, crm_status')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const total = data?.length || 0;
      const attended = data?.filter(l => l.ai_attended).length || 0;
      const sentToCrm = data?.filter(l => l.crm_status === 'sent').length || 0;

      return {
        total,
        attended,
        sentToCrm,
        attendedPercentage: total > 0 ? (attended / total) * 100 : 0,
        sentToCrmPercentage: total > 0 ? (sentToCrm / total) * 100 : 0,
      };
    },
  });
}

export function useLeadsByChannel(month: Date) {
  return useQuery({
    queryKey: ['leads-by-channel', format(month, 'yyyy-MM')],
    queryFn: async (): Promise<LeadsByChannel[]> => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('portal_origin')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const channelCounts: Record<string, number> = {};
      data?.forEach(lead => {
        const channel = lead.portal_origin || 'Desconhecido';
        channelCounts[channel] = (channelCounts[channel] || 0) + 1;
      });

      const total = data?.length || 1;
      return Object.entries(channelCounts).map(([channel, count]) => ({
        channel,
        count,
        percentage: (count / total) * 100,
      }));
    },
  });
}

export function useLeadsByStatus(month: Date) {
  return useQuery({
    queryKey: ['leads-by-status', format(month, 'yyyy-MM')],
    queryFn: async (): Promise<LeadsByStatus[]> => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('portal_origin, crm_status')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const statusByChannel: Record<string, LeadsByStatus> = {};
      data?.forEach(lead => {
        const channel = lead.portal_origin || 'Desconhecido';
        if (!statusByChannel[channel]) {
          statusByChannel[channel] = { channel, sent: 0, error: 0, notReady: 0 };
        }
        if (lead.crm_status === 'sent') statusByChannel[channel].sent++;
        else if (lead.crm_status === 'error') statusByChannel[channel].error++;
        else statusByChannel[channel].notReady++;
      });

      return Object.values(statusByChannel);
    },
  });
}

export function useLeadsByHour(month: Date) {
  return useQuery({
    queryKey: ['leads-by-hour', format(month, 'yyyy-MM')],
    queryFn: async (): Promise<{ data: LeadsByHour[]; outsideBusinessHours: number }> => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('created_at, hour_of_day')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const hourCounts: Record<number, number> = {};
      let outsideCount = 0;
      const total = data?.length || 1;

      data?.forEach(lead => {
        const hour = lead.hour_of_day ?? new Date(lead.created_at || '').getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        if (hour < 9 || hour >= 18) outsideCount++;
      });

      const hourData: LeadsByHour[] = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourCounts[i] || 0,
      }));

      return {
        data: hourData,
        outsideBusinessHours: (outsideCount / total) * 100,
      };
    },
  });
}

export function useLeadsByWeekday(month: Date) {
  return useQuery({
    queryKey: ['leads-by-weekday', format(month, 'yyyy-MM')],
    queryFn: async (): Promise<{ data: LeadsByDay[]; bestDay: string }> => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const { data, error } = await supabase
        .from('portal_leads_log')
        .select('created_at, day_of_week')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;

      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const dayCounts: Record<number, number> = {};

      data?.forEach(lead => {
        const day = lead.day_of_week ?? new Date(lead.created_at || '').getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });

      const dayData: LeadsByDay[] = dayNames.map((day, i) => ({
        day,
        count: dayCounts[i] || 0,
      }));

      const bestDayIndex = Object.entries(dayCounts).reduce(
        (max, [day, count]) => (count > max.count ? { day: Number(day), count } : max),
        { day: 0, count: 0 }
      ).day;

      return {
        data: dayData,
        bestDay: dayNames[bestDayIndex] || 'Segunda',
      };
    },
  });
}

export function useLeadsMonthly() {
  return useQuery({
    queryKey: ['leads-monthly'],
    queryFn: async (): Promise<LeadsByMonth[]> => {
      const months: LeadsByMonth[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const month = subMonths(new Date(), i);
        const start = startOfMonth(month);
        const end = endOfMonth(month);

        const { data, error } = await supabase
          .from('portal_leads_log')
          .select('crm_status')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());

        if (error) throw error;

        const sent = data?.filter(l => l.crm_status === 'sent').length || 0;
        const notSent = (data?.length || 0) - sent;

        months.push({
          month: format(month, 'MMM', { locale: ptBR }),
          sent,
          notSent,
        });
      }

      return months;
    },
  });
}
