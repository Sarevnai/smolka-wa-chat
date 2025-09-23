import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ReportStats {
  todayMessages: number;
  activeConversations: number;
  avgResponseTime: string;
  responseRate: string;
  totalContacts: number;
  activeTickets: number;
  completedTickets: number;
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

export function useReports() {
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

      // Buscar estatísticas principais
      const [
        { count: todayMessages },
        { count: totalContacts },
        { count: activeTickets },
        { count: completedTickets },
        { data: messagesData },
        { data: recentMessages },
        { data: recentTickets }
      ] = await Promise.all([
        // Mensagens de hoje
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', todayISO),
        
        // Total de contatos ativos
        supabase
          .from('contacts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo'),
        
        // Tickets ativos
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .neq('stage', 'concluido'),
        
        // Tickets concluídos
        supabase
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .eq('stage', 'concluido'),
        
        // Mensagens para análise de conversas ativas e tempo de resposta
        supabase
          .from('messages')
          .select('wa_from, wa_to, direction, created_at')
          .gte('created_at', todayISO)
          .order('created_at', { ascending: false })
          .limit(100),
        
        // Mensagens recentes para atividade
        supabase
          .from('messages')
          .select('wa_from, wa_to, direction, created_at, body')
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Tickets recentes para atividade
        supabase
          .from('tickets')
          .select('phone, title, stage, created_at, category')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Calcular conversas ativas (números únicos que enviaram mensagens hoje)
      const uniqueNumbers = new Set();
      messagesData?.forEach(msg => {
        if (msg.direction === 'inbound' && msg.wa_from) {
          uniqueNumbers.add(msg.wa_from);
        }
      });
      const activeConversations = uniqueNumbers.size;

      // Calcular tempo médio de resposta (simulado por enquanto)
      const avgResponseTime = "2.3min";
      const responseRate = "92%";

      // Montar estatísticas
      const statsData: ReportStats = {
        todayMessages: todayMessages || 0,
        activeConversations,
        avgResponseTime,
        responseRate,
        totalContacts: totalContacts || 0,
        activeTickets: activeTickets || 0,
        completedTickets: completedTickets || 0
      };

      // Montar atividade recente
      const activities: RecentActivity[] = [];
      
      // Adicionar mensagens recentes
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

      // Adicionar tickets recentes
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

      // Ordenar por horário mais recente
      activities.sort((a, b) => b.time.localeCompare(a.time));

      // Mensagens por período (últimos 7 dias)
      const periodData: MessagesByPeriod[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        
        const { data: dayMessages } = await supabase
          .from('messages')
          .select('direction')
          .gte('created_at', date.toISOString())
          .lte('created_at', endDate.toISOString());

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
  }, [user]);

  return {
    stats,
    recentActivity, 
    messagesByPeriod,
    loading,
    refreshData: fetchReportsData
  };
}