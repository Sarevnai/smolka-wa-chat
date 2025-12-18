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
  const [creating, setCreating] = useState(false);
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

      // Combinar dados
      const combinedUsers: UserWithStatus[] = profiles?.map(profile => {
        const userFunction = functions?.find(r => r.user_id === profile.user_id);
        const userStatus = statuses?.find(s => s.user_id === profile.user_id);

        return {
          id: profile.id,
          user_id: profile.user_id,
          email: 'N/A', // Email fetched via edge function if needed
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

  const createUser = async (data: {
    email: string;
    full_name: string;
    password: string;
    function?: AppFunction;
    department_code?: string;
  }) => {
    try {
      setCreating(true);

      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: data,
      });

      if (error) throw error;

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Usuário criado',
        description: `O usuário ${data.email} foi criado com sucesso.`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Erro ao criar usuário',
        description: error.message || 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setCreating(false);
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

  const removeUserFunction = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_functions')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Função removida',
        description: 'A função do usuário foi removida com sucesso.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error removing function:', error);
      toast({
        title: 'Erro ao remover função',
        description: 'Não foi possível remover a função do usuário.',
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

  const deleteUser = async (userId: string) => {
    try {
      const { data: result, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Usuário excluído',
        description: 'O usuário foi excluído permanentemente.',
      });

      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message || 'Não foi possível excluir o usuário.',
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
    creating,
    refetch: fetchUsers,
    createUser,
    updateUserFunction,
    removeUserFunction,
    toggleUserStatus,
    blockUser,
    unblockUser,
    deleteUser,
  };
}