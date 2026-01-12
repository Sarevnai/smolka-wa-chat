import { Badge } from '@/components/ui/badge';
import { Home, FileText, TrendingUp, Target } from 'lucide-react';

type DepartmentCode = 'locacao' | 'administrativo' | 'vendas' | 'marketing' | null;

interface DepartmentBadgeProps {
  departmentCode: DepartmentCode;
  className?: string;
}

const DEPARTMENT_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  locacao: {
    label: 'Locação',
    icon: Home,
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20',
  },
  administrativo: {
    label: 'Administrativo',
    icon: FileText,
    className: 'bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20',
  },
  vendas: {
    label: 'Vendas',
    icon: TrendingUp,
    className: 'bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20',
  },
  marketing: {
    label: 'Marketing',
    icon: Target,
    className: 'bg-pink-500/10 text-pink-600 border-pink-500/20 hover:bg-pink-500/20',
  },
};

export function DepartmentBadge({ departmentCode, className = '' }: DepartmentBadgeProps) {
  if (!departmentCode) {
    return (
      <Badge variant="outline" className={`text-muted-foreground ${className}`}>
        Sem Setor
      </Badge>
    );
  }

  const config = DEPARTMENT_CONFIG[departmentCode];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export const DEPARTMENT_OPTIONS = [
  { value: 'locacao', label: 'Locação' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'marketing', label: 'Marketing' },
] as const;
