import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserPermission {
  id: string;
  user_id: string;
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_custom: boolean;
  updated_at: string;
}

export interface EffectivePermission {
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_custom: boolean;
}

export function useUserPermissions(userId?: string) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch custom user permissions
      const { data: userPerms, error: userError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (userError) {
        console.error('Error fetching user permissions:', {
          error: userError,
          userId,
          message: userError.message,
          details: userError.details
        });
        throw userError;
      }
      setPermissions(userPerms || []);

      // Fetch effective permissions (role + user)
      const { data: effectivePerms, error: effectiveError } = await supabase
        .rpc('get_user_effective_permissions', { p_user_id: userId });

      if (effectiveError) {
        console.error('Error fetching effective permissions:', {
          error: effectiveError,
          userId,
          message: effectiveError.message,
          details: effectiveError.details
        });
        throw effectiveError;
      }
      setEffectivePermissions(effectivePerms || []);
    } catch (error: any) {
      console.error('Error in fetchUserPermissions:', error);
      toast.error(`Erro ao carregar permissões: ${error.message || 'Desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const setUserPermission = async (
    resource: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    if (!userId) return;

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      // Check if current user is admin
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc('is_admin');
      
      if (adminCheckError) {
        console.error('Error checking admin status:', {
          error: adminCheckError,
          message: adminCheckError.message
        });
        throw new Error('Erro ao verificar permissões de administrador');
      }
      
      if (!isAdmin) {
        toast.error('Você não tem permissão para alterar permissões de usuários');
        return;
      }
      
      // Check if permission exists
      const existingPerm = permissions.find(p => p.resource === resource);

      if (existingPerm) {
        // Update existing permission
        const { error } = await supabase
          .from('user_permissions')
          .update({ 
            [field]: value,
            updated_at: new Date().toISOString(),
            updated_by: currentUser.user?.id
          })
          .eq('user_id', userId)
          .eq('resource', resource);

        if (error) {
          console.error('Error updating user permission:', {
            error,
            userId,
            resource,
            field,
            value,
            message: error.message,
            code: error.code,
            details: error.details
          });
          throw error;
        }
      } else {
        // Create new permission - use effective permissions as base
        const effectivePerm = effectivePermissions.find(p => p.resource === resource);
        const basePermissions = effectivePerm ? {
          can_view: effectivePerm.can_view,
          can_create: effectivePerm.can_create,
          can_edit: effectivePerm.can_edit,
          can_delete: effectivePerm.can_delete,
        } : {
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        };

        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            resource,
            ...basePermissions,
            [field]: value,
            is_custom: true,
            updated_by: currentUser.user?.id
          });

        if (error) {
          console.error('Error creating user permission:', {
            error,
            userId,
            resource,
            field,
            value,
            basePermissions,
            message: error.message,
            code: error.code,
            details: error.details
          });
          throw error;
        }
      }
      
      toast.success('Permissão atualizada');
      await fetchUserPermissions();
    } catch (error: any) {
      console.error('Error in setUserPermission:', error);
      toast.error(`Erro ao atualizar permissão: ${error.message || 'Desconhecido'}`);
    }
  };

  const resetToRoleDefaults = async (resource?: string) => {
    if (!userId) return;

    try {
      if (resource) {
        // Reset specific resource
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId)
          .eq('resource', resource);

        if (error) throw error;
        toast.success('Permissão resetada para padrão do cargo');
      } else {
        // Reset all permissions
        const { error } = await supabase
          .from('user_permissions')
          .delete()
          .eq('user_id', userId);

        if (error) throw error;
        toast.success('Todas as permissões resetadas para padrões do cargo');
      }
      
      await fetchUserPermissions();
    } catch (error: any) {
      console.error('Error resetting permissions:', error);
      toast.error('Erro ao resetar permissões');
    }
  };

  useEffect(() => {
    fetchUserPermissions();
  }, [userId]);

  return {
    permissions,
    effectivePermissions,
    loading,
    setUserPermission,
    resetToRoleDefaults,
    refetch: fetchUserPermissions
  };
}
