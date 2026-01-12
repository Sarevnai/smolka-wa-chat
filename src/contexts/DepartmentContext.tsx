import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];
type ViewMode = 'leads' | 'tasks';

interface DepartmentContextType {
  activeDepartment: DepartmentType | null;
  userDepartment: DepartmentType | null;
  setActiveDepartment: (dept: DepartmentType | null) => void;
  isAdmin: boolean;
  loading: boolean;
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

const DepartmentContext = createContext<DepartmentContextType | undefined>(undefined);

// Auto-detect view mode based on department
function getDefaultViewMode(department: DepartmentType | null): ViewMode {
  switch (department) {
    case 'locacao':
    case 'vendas':
      return 'leads';
    case 'administrativo':
      return 'tasks';
    default:
      return 'leads'; // Default for admins/null
  }
}

export function DepartmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [userDepartment, setUserDepartment] = useState<DepartmentType | null>(null);
  const [activeDepartment, setActiveDepartmentState] = useState<DepartmentType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewModeState] = useState<ViewMode>('leads');

  useEffect(() => {
    const fetchUserData = async () => {
      // Reset state on user change to prevent stale data between logins
      setLoading(true);
      setUserDepartment(null);
      setActiveDepartmentState(null);
      
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin
        const { data: functions } = await supabase
          .from('user_functions')
          .select('function')
          .eq('user_id', user.id);

        const hasAdmin = functions?.some(f => f.function === 'admin') || false;
        setIsAdmin(hasAdmin);

        // Get user's department via secure RPC (bypasses RLS issues)
        let deptCode: DepartmentType | null = null;
        
        const { data: rpcResult, error: rpcError } = await supabase.rpc('get_my_department');
        
        if (!rpcError && rpcResult) {
          deptCode = rpcResult as DepartmentType;
        } else {
          // Fallback: direct query if RPC fails
          console.warn('RPC get_my_department failed, falling back to direct query:', rpcError);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('department_code')
            .eq('user_id', user.id)
            .single();
          
          if (!profileError && profile) {
            deptCode = profile.department_code;
          }
        }
        
        console.log('[DepartmentContext] User department loaded:', { userId: user.id, deptCode, hasAdmin });
        
        setUserDepartment(deptCode);

        // Load saved preference for admins or use user's department
        if (hasAdmin) {
          const savedDept = localStorage.getItem('activeDepartment');
          // For admins: use saved preference, or user's own department, or fallback to locacao
          if (savedDept && ['locacao', 'administrativo', 'vendas', 'marketing'].includes(savedDept)) {
            setActiveDepartmentState(savedDept as DepartmentType);
          } else if (deptCode) {
            setActiveDepartmentState(deptCode);
          } else {
            setActiveDepartmentState('locacao');
          }
          
          // Load saved view mode preference for admins
          const savedViewMode = localStorage.getItem('viewMode');
          if (savedViewMode && ['leads', 'tasks'].includes(savedViewMode)) {
            setViewModeState(savedViewMode as ViewMode);
          } else {
            setViewModeState('leads');
          }
        } else {
          // Non-admin: use their department directly
          setActiveDepartmentState(deptCode);
          // Set view mode based on department
          setViewModeState(getDefaultViewMode(deptCode));
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
    
    // Auto-switch view mode when department changes (for admins)
    if (isAdmin) {
      const newViewMode = getDefaultViewMode(dept);
      setViewModeState(newViewMode);
      localStorage.setItem('viewMode', newViewMode);
    }
  };

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (isAdmin) {
      localStorage.setItem('viewMode', mode);
    }
  };

  return (
    <DepartmentContext.Provider value={{
      activeDepartment,
      userDepartment,
      setActiveDepartment,
      isAdmin,
      loading,
      viewMode,
      setViewMode
    }}>
      {children}
    </DepartmentContext.Provider>
  );
}

export function useDepartment(): DepartmentContextType {
  const context = useContext(DepartmentContext);
  // Return safe defaults if used outside provider (e.g., during initial render)
  if (context === undefined) {
    return {
      activeDepartment: null,
      userDepartment: null,
      setActiveDepartment: () => {},
      isAdmin: false,
      loading: true,
      viewMode: 'leads',
      setViewMode: () => {}
    };
  }
  return context;
}
