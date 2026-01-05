import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  blockedUsers: number;
  usersByRole: {
    admin: number;
    manager: number;
    attendant: number;
    marketing: number;
    none: number;
  };
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  messagesLast30d: number;
  totalContacts: number;
  totalCampaigns: number;
  totalTickets: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Total de usuários
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Usuários ativos/inativos/bloqueados
      const { data: userStatuses } = await supabase
        .from('user_status')
        .select('is_active, is_blocked');

      const activeUsers = userStatuses?.filter(u => u.is_active && !u.is_blocked).length || 0;
      const inactiveUsers = userStatuses?.filter(u => !u.is_active).length || 0;
      const blockedUsers = userStatuses?.filter(u => u.is_blocked).length || 0;

      // Usuários por função
      const { data: functions } = await supabase
        .from('user_functions')
        .select('function');

      const adminCount = functions?.filter(f => f.function === 'admin').length || 0;
      const managerCount = functions?.filter(f => f.function === 'manager').length || 0;
      const attendantCount = functions?.filter(f => f.function === 'attendant').length || 0;
      const marketingCount = functions?.filter(f => f.function === 'marketing').length || 0;
      const noneCount = (totalUsers || 0) - (adminCount + managerCount + attendantCount + marketingCount);

      // Total de mensagens
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Mensagens últimas 24h
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: messagesLast24h } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo);

      // Mensagens últimos 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: messagesLast7d } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      // Mensagens últimos 30 dias
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count: messagesLast30d } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo);

      // Total de contatos
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Total de campanhas
      const { count: totalCampaigns } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      // Total de tickets
      const { count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      // Determinar saúde do sistema (simplificado)
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (blockedUsers > 0 || inactiveUsers > (totalUsers || 0) * 0.5) {
        systemHealth = 'warning';
      }

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        inactiveUsers,
        blockedUsers,
        usersByRole: {
          admin: adminCount,
          manager: managerCount,
          attendant: attendantCount,
          marketing: marketingCount,
          none: noneCount,
        },
        totalMessages: totalMessages || 0,
        messagesLast24h: messagesLast24h || 0,
        messagesLast7d: messagesLast7d || 0,
        messagesLast30d: messagesLast30d || 0,
        totalContacts: totalContacts || 0,
        totalCampaigns: totalCampaigns || 0,
        totalTickets: totalTickets || 0,
        systemHealth,
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: 'Erro ao carregar estatísticas',
        description: 'Não foi possível carregar as estatísticas do sistema.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { stats, loading, refetch: fetchStats };
}
