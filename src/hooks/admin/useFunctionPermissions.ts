import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FunctionPermission {
  id: string;
  function: 'admin' | 'manager' | 'attendant' | 'marketing';
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  updated_at: string;
}

export function useFunctionPermissions() {
  const [permissions, setPermissions] = useState<FunctionPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('function_permissions')
        .select('*')
        .order('function', { ascending: true })
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
    userFunction: 'admin' | 'manager' | 'attendant' | 'marketing',
    resource: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('function_permissions')
        .update({ 
          [field]: value,
          updated_by: currentUser.user?.id
        })
        .eq('function', userFunction)
        .eq('resource', resource);

      if (error) throw error;
      
      toast.success('Permissão atualizada com sucesso');
      await fetchPermissions();
    } catch (error: any) {
      console.error('Error updating permission:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const getPermissionsByFunction = (userFunction: 'admin' | 'manager' | 'attendant' | 'marketing') => {
    return permissions.filter(p => p.function === userFunction);
  };

  const getPermissionForResource = (userFunction: 'admin' | 'manager' | 'attendant' | 'marketing', resource: string) => {
    return permissions.find(p => p.function === userFunction && p.resource === resource);
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  return {
    permissions,
    loading,
    updatePermission,
    getPermissionsByFunction,
    getPermissionForResource,
    refetch: fetchPermissions
  };
}
