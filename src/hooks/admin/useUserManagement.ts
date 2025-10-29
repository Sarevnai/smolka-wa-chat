import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AppFunction } from '@/types/functions';
import { useToast } from '@/hooks/use-toast';

export interface UserWithStatus {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  username: string;
  user_code: number;
  avatar_url: string | null;
  function: AppFunction | null;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  last_login: string | null;
  created_at: string;
}

export function useUserManagement() {
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Buscar perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, username, user_code, avatar_url, created_at')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Buscar functions
      const { data: functions, error: functionsError } = await supabase
        .from('user_functions')
        .select('user_id, function');

      if (functionsError) throw functionsError;

      // Buscar status
      const { data: statuses, error: statusesError } = await supabase
        .from('user_status')
        .select('user_id, is_active, is_blocked, blocked_reason, last_login');

      if (statusesError) throw statusesError;

      // Buscar emails
      const userIds = profiles?.map(p => p.user_id) || [];
      const emailPromises = userIds.map(async (userId) => {
        const { data } = await supabase.auth.admin.getUserById(userId);
        return { id: userId, email: data.user?.email || 'N/A' };
      });
      const emailResults = await Promise.all(emailPromises);

      // Combinar dados
      const combinedUsers: UserWithStatus[] = profiles?.map(profile => {
        const emailData = emailResults.find(e => e.id === profile.user_id);
        const userFunction = functions?.find(r => r.user_id === profile.user_id);
        const userStatus = statuses?.find(s => s.user_id === profile.user_id);

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: emailData?.email || 'N/A',
          full_name: profile.full_name,
          username: profile.username,
          user_code: profile.user_code,
          avatar_url: profile.avatar_url,
          function: userFunction?.function as AppFunction || null,
          is_active: userStatus?.is_active ?? true,
          is_blocked: userStatus?.is_blocked ?? false,
          blocked_reason: userStatus?.blocked_reason || null,
          last_login: userStatus?.last_login || null,
          created_at: profile.created_at,
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Erro ao carregar usuários',
        description: 'Não foi possível carregar a lista de usuários.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserFunction = async (userId: string, newFunction: AppFunction) => {
    try {
      // Remove function antiga
      await supabase.from('user_functions').delete().eq('user_id', userId);

      // Adiciona nova function
      const { error } = await supabase
        .from('user_functions')
        .insert({ user_id: userId, function: newFunction });

      if (error) throw error;

      toast({
        title: 'Função atualizada',
        description: 'A função do usuário foi atualizada com sucesso.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating function:', error);
      toast({
        title: 'Erro ao atualizar função',
        description: 'Não foi possível atualizar a função do usuário.',
        variant: 'destructive',
      });
    }
  };

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_status')
        .upsert({ user_id: userId, is_active: isActive });

      if (error) throw error;

      toast({
        title: isActive ? 'Usuário ativado' : 'Usuário desativado',
        description: `O usuário foi ${isActive ? 'ativado' : 'desativado'} com sucesso.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Erro ao alterar status',
        description: 'Não foi possível alterar o status do usuário.',
        variant: 'destructive',
      });
    }
  };

  const blockUser = async (userId: string, reason: string, until?: Date) => {
    try {
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          is_blocked: true,
          blocked_reason: reason,
          blocked_until: until?.toISOString(),
        });

      if (error) throw error;

      toast({
        title: 'Usuário bloqueado',
        description: 'O usuário foi bloqueado com sucesso.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        title: 'Erro ao bloquear usuário',
        description: 'Não foi possível bloquear o usuário.',
        variant: 'destructive',
      });
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          is_blocked: false,
          blocked_reason: null,
          blocked_until: null,
        });

      if (error) throw error;

      toast({
        title: 'Usuário desbloqueado',
        description: 'O usuário foi desbloqueado com sucesso.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        title: 'Erro ao desbloquear usuário',
        description: 'Não foi possível desbloquear o usuário.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    refetch: fetchUsers,
    updateUserFunction,
    toggleUserStatus,
    blockUser,
    unblockUser,
  };
}
