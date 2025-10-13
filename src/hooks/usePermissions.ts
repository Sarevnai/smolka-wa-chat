import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { AppRole, RolePermissions } from '@/types/roles';

export function usePermissions(): RolePermissions & { 
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAttendant: boolean;
  loading: boolean;
} {
  const { profile, loading } = useAuth();
  
  const roles = useMemo(() => {
    return profile?.roles || [];
  }, [profile]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isAttendant = hasRole('attendant');

  const permissions = useMemo((): RolePermissions => {
    if (isAdmin) {
      return {
        canViewDashboard: true,
        canViewChats: true,
        canSendMessages: true,
        canDeleteMessages: true,
        canViewContacts: true,
        canEditContacts: true,
        canDeleteContacts: true,
        canViewCampaigns: true,
        canCreateCampaigns: true,
        canSendCampaigns: true,
        canViewReports: true,
        canViewFinancialReports: true,
        canManageIntegrations: true,
        canManageUsers: true,
        canAccessSettings: true,
        canCreateTickets: true,
        canDeleteTickets: true,
        canViewAllTickets: true,
        canManageCategories: true,
      };
    }

    if (isManager) {
      return {
        canViewDashboard: true,
        canViewChats: true,
        canSendMessages: true,
        canDeleteMessages: false,
        canViewContacts: true,
        canEditContacts: true,
        canDeleteContacts: false,
        canViewCampaigns: true,
        canCreateCampaigns: false,
        canSendCampaigns: false,
        canViewReports: true,
        canViewFinancialReports: false,
        canManageIntegrations: false,
        canManageUsers: false,
        canAccessSettings: false,
        canCreateTickets: true,
        canDeleteTickets: false,
        canViewAllTickets: true,
        canManageCategories: true,
      };
    }

    // Attendant (padrão)
    return {
      canViewDashboard: false,
      canViewChats: true,
      canSendMessages: true,
      canDeleteMessages: false,
      canViewContacts: true,
      canEditContacts: false,
      canDeleteContacts: false,
      canViewCampaigns: false,
      canCreateCampaigns: false,
      canSendCampaigns: false,
      canViewReports: false,
      canViewFinancialReports: false,
      canManageIntegrations: false,
      canManageUsers: false,
      canAccessSettings: false,
      canCreateTickets: true,
      canDeleteTickets: false,
      canViewAllTickets: false,
      canManageCategories: false,
    };
  }, [isAdmin, isManager, isAttendant]);

  return {
    ...permissions,
    roles,
    hasRole,
    isAdmin,
    isManager,
    isAttendant,
    loading,
  };
}
