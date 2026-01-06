import { useEffect } from 'react';
import { useDepartment } from '@/contexts/DepartmentContext';

export type DepartmentCode = 'locacao' | 'administrativo' | 'vendas' | 'marketing';

export function useSyncDepartment(departmentCode: DepartmentCode) {
  const { setActiveDepartment } = useDepartment();
  
  useEffect(() => {
    setActiveDepartment(departmentCode);
  }, [departmentCode, setActiveDepartment]);
}
