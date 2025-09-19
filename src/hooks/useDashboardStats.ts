import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DashboardStats {
  totalMessages: number;
  messagestoday: number;
  activeConversations: number;
  totalContacts: number;
  campaignsSent: number;
  responseRate: number;
  avgResponseTime: string;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'message' | 'campaign' | 'contact' | 'integration';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'pending' | 'error';
}

export function useDashboardStats() {
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

      // Fetch total messages
      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true });

      // Fetch messages today
      const { count: messagestoday } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      // Fetch total contacts
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });

      // Fetch campaigns sent
      const { count: campaignsSent } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true });

      // Get active conversations (contacts with messages in the last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activeConversationsData } = await supabase
        .from('messages')
        .select('wa_from')
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('wa_from', 'is', null);

      const uniqueConversations = new Set(activeConversationsData?.map(m => m.wa_from) || []);
      const activeConversations = uniqueConversations.size;

      // Calculate response rate (simplified)
      const { count: outboundCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'outbound')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { count: inboundCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .gte('created_at', sevenDaysAgo.toISOString());

      const responseRate = outboundCount && inboundCount && outboundCount > 0
        ? Math.round((inboundCount / outboundCount) * 100)
        : 0;

      // Fetch recent activity
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, wa_from, media_type, direction, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: recentCampaigns } = await supabase
        .from('campaigns')
        .select('id, name, status, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

      const { data: recentContacts } = await supabase
        .from('contacts')
        .select('id, name, phone, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

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
        activeConversations,
        totalContacts: totalContacts || 0,
        campaignsSent: campaignsSent || 0,
        responseRate,
        avgResponseTime: '2min', // Simplified for now
        recentActivity
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
  }, []);

  return {
    stats,
    loading,
    refreshStats: fetchDashboardStats
  };
}