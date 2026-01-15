import { 
  Home, 
  MessageCircle, 
  Send, 
  Users, 
  BarChart3, 
  LayoutDashboard,
  Bot,
  AlertTriangle,
  ShoppingBag,
  Building2,
  Kanban,
  Megaphone,
  Workflow,
  LucideIcon
} from "lucide-react";
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

export interface SidebarItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: 'unread' | 'triage';
}

export interface DepartmentSidebarConfig {
  label: string;
  icon: LucideIcon;
  gradient: string;
  bgLight: string;
  textColor: string;
  borderColor: string;
  accentColor: string;
  items: SidebarItem[];
}

export const DEPARTMENT_SIDEBAR_CONFIG: Record<DepartmentType, DepartmentSidebarConfig> = {
  locacao: {
    label: 'Locação',
    icon: Home,
    gradient: 'from-blue-600 to-blue-700',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    accentColor: 'bg-blue-600',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Conversas', url: '/chat', icon: MessageCircle, badge: 'unread' },
      { title: 'Pipeline', url: '/pipeline/locacao', icon: Kanban },
      { title: 'Contatos', url: '/contacts', icon: Users },
      { title: 'Campanhas', url: '/send', icon: Send },
      { title: 'Relatórios', url: '/reports', icon: BarChart3 },
    ]
  },
  vendas: {
    label: 'Vendas',
    icon: ShoppingBag,
    gradient: 'from-emerald-600 to-emerald-700',
    bgLight: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    borderColor: 'border-emerald-200',
    accentColor: 'bg-emerald-600',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Conversas', url: '/chat', icon: MessageCircle, badge: 'unread' },
      { title: 'Pipeline', url: '/pipeline/vendas', icon: Kanban },
      { title: 'Contatos', url: '/contacts', icon: Users },
      { title: 'Campanhas', url: '/send', icon: Send },
      { title: 'Relatórios', url: '/reports', icon: BarChart3 },
    ]
  },
  administrativo: {
    label: 'Administrativo',
    icon: Building2,
    gradient: 'from-slate-600 to-slate-700',
    bgLight: 'bg-slate-50',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
    accentColor: 'bg-slate-600',
    items: [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
      { title: 'Triagem', url: '/triage', icon: AlertTriangle, badge: 'triage' },
      { title: 'Conversas', url: '/chat', icon: MessageCircle, badge: 'unread' },
      { title: 'Contatos', url: '/contacts', icon: Users },
      { title: 'Relatórios', url: '/reports', icon: BarChart3 },
    ]
  },
  marketing: {
    label: 'Marketing',
    icon: Megaphone,
    gradient: 'from-pink-600 to-pink-700',
    bgLight: 'bg-pink-50',
    textColor: 'text-pink-600',
    borderColor: 'border-pink-200',
    accentColor: 'bg-pink-600',
    items: [
      { title: 'Dashboard', url: '/marketing', icon: LayoutDashboard },
      { title: 'Conversas', url: '/marketing/chat', icon: MessageCircle },
      { title: 'Campanhas', url: '/marketing/campaigns', icon: Megaphone },
      { title: 'Contatos', url: '/marketing/contacts', icon: Users },
      { title: 'Relatórios', url: '/marketing/reports', icon: BarChart3 },
      { title: 'Flow Builder', url: '/marketing/flow-builder', icon: Workflow },
    ]
  }
};

export function getDepartmentConfig(department: DepartmentType | null): DepartmentSidebarConfig {
  if (!department) return DEPARTMENT_SIDEBAR_CONFIG.locacao;
  return DEPARTMENT_SIDEBAR_CONFIG[department] || DEPARTMENT_SIDEBAR_CONFIG.locacao;
}
