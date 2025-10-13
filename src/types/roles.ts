export type AppRole = 'admin' | 'manager' | 'attendant';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  canViewDashboard: boolean;
  canViewChats: boolean;
  canSendMessages: boolean;
  canDeleteMessages: boolean;
  canViewContacts: boolean;
  canEditContacts: boolean;
  canDeleteContacts: boolean;
  canViewCampaigns: boolean;
  canCreateCampaigns: boolean;
  canSendCampaigns: boolean;
  canViewReports: boolean;
  canViewFinancialReports: boolean;
  canManageIntegrations: boolean;
  canManageUsers: boolean;
  canAccessSettings: boolean;
  canCreateTickets: boolean;
  canDeleteTickets: boolean;
  canViewAllTickets: boolean;
  canManageCategories: boolean;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  attendant: 'Atendente'
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Acesso total à plataforma',
  manager: 'Acesso a dados operacionais',
  attendant: 'Acesso restrito ao atendimento'
};
