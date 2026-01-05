import { 
  UserPlus, Eye, Star, Home, FileText, Building2, Key, 
  ShoppingBag, TrendingUp, Handshake, Users, Activity,
  Target, Heart, Megaphone,
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
  },
  marketing: {
    types: ['lead', 'prospect', 'engajado', 'campanha'],
    labels: {
      lead: { 
        label: 'Lead', 
        icon: UserPlus, 
        color: 'text-pink-600',
        badgeVariant: 'default'
      },
      prospect: { 
        label: 'Prospect', 
        icon: Target, 
        color: 'text-purple-600',
        badgeVariant: 'secondary'
      },
      engajado: { 
        label: 'Engajado', 
        icon: Heart, 
        color: 'text-rose-600',
        badgeVariant: 'default'
      },
      campanha: { 
        label: 'Campanha', 
        icon: Megaphone, 
        color: 'text-fuchsia-600',
        badgeVariant: 'secondary'
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
  | 'comprador' | 'investidor' | 'proprietario_vendedor' | 'negociacao'  // vendas
  | 'prospect' | 'engajado' | 'campanha';  // marketing

// ============================================
// UI Configuration per Department
// ============================================

export interface DepartmentStatsConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color?: string;
}

export interface DepartmentUIConfig {
  stats: DepartmentStatsConfig[];
  searchPlaceholder: string;
  showContracts: boolean;
}

export const DEPARTMENT_CONTACTS_UI: Record<string, DepartmentUIConfig> = {
  locacao: {
    stats: [
      { key: 'total', label: 'Total de Leads', icon: Users },
      { key: 'lead', label: 'Novos Leads', icon: UserPlus, color: 'text-blue-600' },
      { key: 'qualificado', label: 'Qualificados', icon: Star, color: 'text-yellow-600' },
      { key: 'proposta', label: 'Em Proposta', icon: FileText, color: 'text-orange-600' }
    ],
    searchPlaceholder: 'Buscar por nome, telefone, email ou bairro...',
    showContracts: false
  },
  administrativo: {
    stats: [
      { key: 'total', label: 'Total', icon: Users },
      { key: 'active', label: 'Ativos', icon: Activity, color: 'text-green-600' },
      { key: 'totalContracts', label: 'Contratos', icon: FileText },
      { key: 'activeContracts', label: 'Contratos Ativos', icon: FileText, color: 'text-green-600' }
    ],
    searchPlaceholder: 'Buscar por nome, telefone, email ou contrato...',
    showContracts: true
  },
  vendas: {
    stats: [
      { key: 'total', label: 'Total de Leads', icon: Users },
      { key: 'comprador', label: 'Compradores', icon: ShoppingBag, color: 'text-green-600' },
      { key: 'investidor', label: 'Investidores', icon: TrendingUp, color: 'text-purple-600' },
      { key: 'negociacao', label: 'Em Negociação', icon: Handshake, color: 'text-yellow-600' }
    ],
    searchPlaceholder: 'Buscar por nome, telefone, email ou bairro...',
    showContracts: false
  },
  marketing: {
    stats: [
      { key: 'total', label: 'Total de Leads', icon: Users },
      { key: 'lead', label: 'Novos Leads', icon: UserPlus, color: 'text-pink-600' },
      { key: 'prospect', label: 'Prospects', icon: Target, color: 'text-purple-600' },
      { key: 'engajado', label: 'Engajados', icon: Heart, color: 'text-rose-600' }
    ],
    searchPlaceholder: 'Buscar por nome, telefone, email ou campanha...',
    showContracts: false
  }
};

export function getDepartmentUIConfig(departmentCode?: string): DepartmentUIConfig {
  if (!departmentCode) return DEPARTMENT_CONTACTS_UI.administrativo;
  return DEPARTMENT_CONTACTS_UI[departmentCode] || DEPARTMENT_CONTACTS_UI.administrativo;
}
