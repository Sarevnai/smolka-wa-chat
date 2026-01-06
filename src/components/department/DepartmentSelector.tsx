import { Home, ShoppingBag, Building2, Megaphone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useDepartment } from '@/contexts/DepartmentContext';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';
import { DEPARTMENT_SIDEBAR_CONFIG } from '@/lib/sidebarConfig';

type DepartmentType = Database['public']['Enums']['department_type'];

const departments: { value: DepartmentType; label: string; icon: typeof Home }[] = [
  { value: 'locacao', label: 'Locação', icon: Home },
  { value: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { value: 'administrativo', label: 'Administrativo', icon: Building2 },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
];

export function DepartmentSelector() {
  const { activeDepartment, setActiveDepartment, isAdmin } = useDepartment();

  if (!isAdmin) return null;

  // Default to 'locacao' if no department selected
  const currentDept = activeDepartment || 'locacao';
  const config = DEPARTMENT_SIDEBAR_CONFIG[currentDept];
  const CurrentIcon = config.icon;

  const handleChange = (value: string) => {
    setActiveDepartment(value as DepartmentType);
  };

  return (
    <div className={cn(
      "mx-3 my-3 rounded-lg overflow-hidden",
      "bg-gradient-to-r",
      config.gradient
    )}>
      <Select value={currentDept} onValueChange={handleChange}>
        <SelectTrigger 
          className={cn(
            "w-full border-0 bg-transparent text-white",
            "hover:bg-white/10 transition-colors",
            "focus:ring-0 focus:ring-offset-0",
            "h-12 px-4",
            "[&>svg]:text-white/70 [&>svg]:opacity-70"
          )}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="p-1.5 bg-white/20 rounded-md">
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] uppercase tracking-wider opacity-80">Setor</span>
              <span className="font-semibold leading-none">{config.label}</span>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent className="bg-popover border border-border shadow-lg z-50">
          {departments.map((dept) => {
            const deptConfig = DEPARTMENT_SIDEBAR_CONFIG[dept.value];
            return (
              <SelectItem 
                key={dept.value} 
                value={dept.value}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 py-1">
                  <div className={cn(
                    "p-1.5 rounded-md",
                    deptConfig.bgLight
                  )}>
                    <dept.icon className={cn("h-4 w-4", deptConfig.textColor)} />
                  </div>
                  <span className="font-medium">{dept.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
