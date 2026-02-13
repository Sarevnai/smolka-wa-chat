import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIErrorSummary {
  total_errors: number;
  errors_24h: number;
  errors_7d: number;
  by_agent: { agent_name: string; count: number }[];
  by_type: { error_type: string; count: number }[];
  recent_errors: {
    id: string;
    agent_name: string;
    error_type: string;
    error_message: string;
    phone_number: string | null;
    department_code: string | null;
    created_at: string;
  }[];
  recurring: { error_message: string; count: number; agent_name: string; last_seen: string }[];
}

export function useAIErrorDashboard() {
  return useQuery({
    queryKey: ['ai-error-dashboard'],
    queryFn: async (): Promise<AIErrorSummary> => {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch all errors from last 30 days
      const { data: errors, error } = await supabase
        .from('ai_error_log')
        .select('id, agent_name, error_type, error_message, phone_number, department_code, created_at')
        .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      const all = errors || [];

      // Compute summaries
      const errors24h = all.filter(e => e.created_at >= h24);
      const errors7d = all.filter(e => e.created_at >= d7);

      // By agent
      const agentMap = new Map<string, number>();
      all.forEach(e => agentMap.set(e.agent_name, (agentMap.get(e.agent_name) || 0) + 1));
      const by_agent = Array.from(agentMap.entries())
        .map(([agent_name, count]) => ({ agent_name, count }))
        .sort((a, b) => b.count - a.count);

      // By type
      const typeMap = new Map<string, number>();
      all.forEach(e => typeMap.set(e.error_type, (typeMap.get(e.error_type) || 0) + 1));
      const by_type = Array.from(typeMap.entries())
        .map(([error_type, count]) => ({ error_type, count }))
        .sort((a, b) => b.count - a.count);

      // Recurring (same message > 2 times)
      const msgMap = new Map<string, { count: number; agent_name: string; last_seen: string }>();
      all.forEach(e => {
        const key = e.error_message.substring(0, 100);
        const existing = msgMap.get(key);
        if (existing) {
          existing.count++;
          if (e.created_at > existing.last_seen) existing.last_seen = e.created_at;
        } else {
          msgMap.set(key, { count: 1, agent_name: e.agent_name, last_seen: e.created_at });
        }
      });
      const recurring = Array.from(msgMap.entries())
        .filter(([, v]) => v.count >= 2)
        .map(([error_message, v]) => ({ error_message, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        total_errors: all.length,
        errors_24h: errors24h.length,
        errors_7d: errors7d.length,
        by_agent,
        by_type,
        recent_errors: all.slice(0, 20),
        recurring,
      };
    },
    refetchInterval: 30000, // Refresh every 30s
  });
}
