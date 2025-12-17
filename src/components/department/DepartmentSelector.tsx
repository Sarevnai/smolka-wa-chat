import { Building2, Home, ShoppingBag, Layers } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

const departments: { value: DepartmentType | 'all'; label: string; icon: typeof Building2 }[] = [
  { value: 'all', label: 'Todos os Setores', icon: Layers },
  { value: 'locacao', label: 'Locação', icon: Home },
  { value: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { value: 'administrativo', label: 'Administrativo', icon: Building2 },
];

export function DepartmentSelector() {
  const { activeDepartment, setActiveDepartment, isAdmin } = useDepartment();

  if (!isAdmin) return null;

  const handleChange = (value: string) => {
    if (value === 'all') {
      setActiveDepartment(null);
    } else {
      setActiveDepartment(value as DepartmentType);
    }
  };

  const currentValue = activeDepartment || 'all';
  const CurrentIcon = departments.find(d => d.value === currentValue)?.icon || Layers;

  return (
    <div className="px-3 py-2">
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full bg-surface-card border-border">
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4 text-gold-primary" />
            <SelectValue placeholder="Selecione o setor" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept.value} value={dept.value}>
              <div className="flex items-center gap-2">
                <dept.icon className="h-4 w-4" />
                <span>{dept.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
