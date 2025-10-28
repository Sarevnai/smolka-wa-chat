import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RolePermission {
  id: string;
  role: 'admin' | 'manager' | 'attendant';
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  updated_at: string;
}

export function useRolePermissions() {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role', { ascending: true })
        .order('resource', { ascending: true });

      if (error) throw error;
      setPermissions(data || []);
    } catch (error: any) {
      console.error('Error fetching permissions:', error);
      toast.error('Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (
    role: 'admin' | 'manager' | 'attendant',
    resource: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('role_permissions')
        .update({ 
          [field]: value,
          updated_by: currentUser.user?.id
        })
        .eq('role', role)
        .eq('resource', resource);

      if (error) throw error;
      
      toast.success('Permissão atualizada com sucesso');
      await fetchPermissions();
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const getPermissionsByRole = (role: 'admin' | 'manager' | 'attendant') => {
    return permissions.filter(p => p.role === role);
  };

  const getPermissionForResource = (role: 'admin' | 'manager' | 'attendant', resource: string) => {
    return permissions.find(p => p.role === role && p.resource === resource);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return {
    permissions,
    loading,
    updatePermission,
    getPermissionsByRole,
    getPermissionForResource,
    refetch: fetchPermissions
  };
}
