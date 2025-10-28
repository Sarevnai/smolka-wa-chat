import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ActivityLog {
  id: string;
  user_id: string;
  target_table: string;
  target_id: string;
  action_type: string;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export interface LogFilters {
  userId?: string;
  actionType?: string;
  targetTable?: string;
  dateFrom?: string;
  dateTo?: string;
  searchTerm?: string;
}

export function useActivityLogs(filters?: LogFilters) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();

  const fetchLogs = async (page = 0, pageSize = 50) => {
    try {
      setLoading(true);

      let query = supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.actionType) {
        query = query.eq('action_type', filters.actionType);
      }

      if (filters?.targetTable) {
        query = query.eq('target_table', filters.targetTable);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters?.searchTerm) {
        query = query.or(
          `target_id.ilike.%${filters.searchTerm}%,action_type.ilike.%${filters.searchTerm}%`
        );
      }

      // Paginação
      const from = page * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Buscar informações dos usuários
      const userIds = [...new Set(data?.map(log => log.user_id) || [])];
      const userPromises = userIds.map(async (userId) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('user_id', userId)
          .single();

        const { data: authUser } = await supabase.auth.admin.getUserById(userId);

        return {
          id: userId,
          email: authUser.user?.email || 'N/A',
          name: profile?.full_name || profile?.username || 'Usuário Desconhecido',
        };
      });

      const users = await Promise.all(userPromises);

      // Combinar logs com informações de usuário
      const logsWithUserInfo: ActivityLog[] = data?.map(log => {
        const user = users.find(u => u.id === log.user_id);
        return {
          ...log,
          user_email: user?.email,
          user_name: user?.name,
        };
      }) || [];

      setLogs(logsWithUserInfo);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Erro ao carregar logs',
        description: 'Não foi possível carregar os logs de atividade.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  return {
    logs,
    loading,
    totalCount,
    refetch: fetchLogs,
  };
}

export function useActionTypes() {
  const [actionTypes, setActionTypes] = useState<string[]>([]);

  useEffect(() => {
    const fetchActionTypes = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('action_type')
        .limit(1000);

      const uniqueTypes = [...new Set(data?.map(log => log.action_type) || [])];
      setActionTypes(uniqueTypes.sort());
    };

    fetchActionTypes();
  }, []);

  return actionTypes;
}

export function useTargetTables() {
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    const fetchTables = async () => {
      const { data } = await supabase
        .from('activity_logs')
        .select('target_table')
        .limit(1000);

      const uniqueTables = [...new Set(data?.map(log => log.target_table) || [])];
      setTables(uniqueTables.sort());
    };

    fetchTables();
  }, []);

  return tables;
}
