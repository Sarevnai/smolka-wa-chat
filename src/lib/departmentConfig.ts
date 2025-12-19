import { 
  UserPlus, Eye, Star, Home, FileText, Building2, Key, 
  ShoppingBag, TrendingUp, Target, CheckCircle, Handshake,
  LucideIcon
} from 'lucide-react';

export interface ContactTypeConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive';
}

export interface DepartmentContactConfig {
  types: string[];
  labels: Record<string, ContactTypeConfig>;
}

export const DEPARTMENT_CONTACT_TYPES: Record<string, DepartmentContactConfig> = {
  locacao: {
    types: ['lead', 'interessado', 'qualificado', 'visitou', 'proposta'],
    labels: {
      lead: { 
        label: 'Lead', 
        icon: UserPlus, 
        color: 'text-blue-600',
        badgeVariant: 'default'
      },
      interessado: { 
        label: 'Interessado', 
        icon: Eye, 
        color: 'text-purple-600',
        badgeVariant: 'secondary'
      },
      qualificado: { 
        label: 'Qualificado', 
        icon: Star, 
        color: 'text-yellow-600',
        badgeVariant: 'default'
      },
      visitou: { 
        label: 'Visitou Imóvel', 
        icon: Home, 
        color: 'text-green-600',
        badgeVariant: 'secondary'
      },
      proposta: { 
        label: 'Em Proposta', 
        icon: FileText, 
        color: 'text-orange-600',
        badgeVariant: 'default'
      }
    }
  },
  administrativo: {
    types: ['proprietario', 'inquilino'],
    labels: {
      proprietario: { 
        label: 'Proprietário', 
        icon: Building2, 
        color: 'text-foreground',
        badgeVariant: 'default'
      },
      inquilino: { 
        label: 'Inquilino', 
        icon: Key, 
        color: 'text-foreground',
        badgeVariant: 'secondary'
      }
    }
  },
  vendas: {
    types: ['lead', 'comprador', 'investidor', 'proprietario_vendedor', 'negociacao'],
    labels: {
      lead: { 
        label: 'Lead', 
        icon: UserPlus, 
        color: 'text-blue-600',
        badgeVariant: 'default'
      },
      comprador: { 
        label: 'Comprador', 
        icon: ShoppingBag, 
        color: 'text-green-600',
        badgeVariant: 'secondary'
      },
      investidor: { 
        label: 'Investidor', 
        icon: TrendingUp, 
        color: 'text-purple-600',
        badgeVariant: 'default'
      },
      proprietario_vendedor: { 
        label: 'Proprietário (Vendedor)', 
        icon: Building2, 
        color: 'text-orange-600',
        badgeVariant: 'secondary'
      },
      negociacao: { 
        label: 'Em Negociação', 
        icon: Handshake, 
        color: 'text-yellow-600',
        badgeVariant: 'default'
      }
    }
  }
};

export function getContactTypesForDepartment(departmentCode?: string): DepartmentContactConfig | null {
  if (!departmentCode) return null;
  return DEPARTMENT_CONTACT_TYPES[departmentCode] || null;
}

export function getContactTypeLabel(contactType?: string, departmentCode?: string): ContactTypeConfig | null {
  if (!contactType || !departmentCode) return null;
  const config = DEPARTMENT_CONTACT_TYPES[departmentCode];
  if (!config) return null;
  return config.labels[contactType] || null;
}

// Get all unique contact types across all departments (for type safety)
export type AllContactTypes = 
  | 'lead' | 'interessado' | 'qualificado' | 'visitou' | 'proposta'  // locacao
  | 'proprietario' | 'inquilino'  // administrativo
  | 'comprador' | 'investidor' | 'proprietario_vendedor' | 'negociacao';  // vendas
