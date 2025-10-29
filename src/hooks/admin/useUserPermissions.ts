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

      if (userError) throw userError;
      setPermissions(userPerms || []);

      // Fetch effective permissions (role + user)
      const { data: effectivePerms, error: effectiveError } = await supabase
        .rpc('get_user_effective_permissions', { p_user_id: userId });

      if (effectiveError) throw effectiveError;
      setEffectivePermissions(effectivePerms || []);
    } catch (error: any) {
      console.error('Error fetching user permissions:', error);
      toast.error('Erro ao carregar permissões do usuário');
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

        if (error) throw error;
      } else {
        // Create new permission
        const { error } = await supabase
          .from('user_permissions')
          .insert({
            user_id: userId,
            resource,
            [field]: value,
            is_custom: true,
            updated_by: currentUser.user?.id
          });

        if (error) throw error;
      }
      
      toast.success('Permissão atualizada');
      await fetchUserPermissions();
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
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
