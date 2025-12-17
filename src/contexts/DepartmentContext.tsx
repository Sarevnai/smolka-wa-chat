import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

interface DepartmentContextType {
  activeDepartment: DepartmentType | null;
  userDepartment: DepartmentType | null;
  setActiveDepartment: (dept: DepartmentType | null) => void;
  isAdmin: boolean;
  loading: boolean;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userDepartment, setUserDepartment] = useState<DepartmentType | null>(null);
  const [activeDepartment, setActiveDepartmentState] = useState<DepartmentType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin
        const { data: functions } = await supabase
          .from('user_functions')
          .select('function, department_code')
          .eq('user_id', user.id);

        const hasAdmin = functions?.some(f => f.function === 'admin') || false;
        setIsAdmin(hasAdmin);

        // Get user's department
        const deptCode = functions?.find(f => f.department_code)?.department_code || null;
        setUserDepartment(deptCode);

        // Load saved preference for admins or use user's department
        if (hasAdmin) {
          const saved = localStorage.getItem('activeDepartment');
          if (saved && ['locacao', 'administrativo', 'vendas'].includes(saved)) {
            setActiveDepartmentState(saved as DepartmentType);
          } else {
            setActiveDepartmentState(null); // Admin sees all by default
          }
        } else {
          setActiveDepartmentState(deptCode);
        }
      } catch (error) {
        console.error('Error fetching user department:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user?.id]);

  const setActiveDepartment = (dept: DepartmentType | null) => {
    setActiveDepartmentState(dept);
    if (dept) {
      localStorage.setItem('activeDepartment', dept);
    } else {
      localStorage.removeItem('activeDepartment');
    }
  };

  return (
    <DepartmentContext.Provider value={{
      activeDepartment,
      userDepartment,
      setActiveDepartment,
      isAdmin,
      loading
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment() {
  const context = useContext(DepartmentContext);
  if (context === undefined) {
    throw new Error('useDepartment must be used within a DepartmentProvider');
  }
  return context;
}
