import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

interface UserDepartment {
  department: DepartmentType | null;
  loading: boolean;
  error: string | null;
}

export function useUserDepartment(): UserDepartment {
  const { user } = useAuth();
  const [department, setDepartment] = useState<DepartmentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDepartment = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Get department from profiles table
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('department_code')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setDepartment(data?.department_code || null);
      } catch (err) {
        console.error('Error fetching user department:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar departamento');
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [user?.id]);

  return { department, loading, error };
}
