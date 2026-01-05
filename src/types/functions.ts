export type AppFunction = 'admin' | 'manager' | 'attendant' | 'marketing';

export interface UserFunction {
  id: string;
  user_id: string;
  function: AppFunction;
  created_at: string;
  updated_at: string;
}

export interface FunctionPermissions {
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

export const FUNCTION_LABELS: Record<AppFunction, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  attendant: 'Atendente',
  marketing: 'Marketing'
};

export const FUNCTION_DESCRIPTIONS: Record<AppFunction, string> = {
  admin: 'Acesso total à plataforma',
  manager: 'Acesso a dados operacionais',
  attendant: 'Acesso restrito ao atendimento',
  marketing: 'Acesso ao setor de Marketing'
};
