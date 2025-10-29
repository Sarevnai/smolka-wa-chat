import { useMemo, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { AppRole, RolePermissions } from '@/types/roles';
import { supabase } from '@/integrations/supabase/client';

interface EffectivePermission {
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_custom: boolean;
}

export function usePermissions(): RolePermissions & { 
  roles: AppRole[];
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isManager: boolean;
  isAttendant: boolean;
  loading: boolean;
} {
  const { profile, loading: authLoading, user } = useAuth();
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  
  // Fetch user-specific permissions from database
  useEffect(() => {
    const fetchEffectivePermissions = async () => {
      if (!user?.id) {
        setPermissionsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_user_effective_permissions', { p_user_id: user.id });

        if (error) throw error;
        setEffectivePermissions(data || []);
      } catch (error) {
        console.error('Error fetching effective permissions:', error);
      } finally {
        setPermissionsLoading(false);
      }
    };

    if (user?.id && !authLoading) {
      fetchEffectivePermissions();
    } else {
      setPermissionsLoading(false);
    }
  }, [user?.id, authLoading]);

  const roles = useMemo(() => {
    return profile?.roles || [];
  }, [profile]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole('admin');
  const isManager = hasRole('manager');
  const isAttendant = hasRole('attendant');

  // Helper to get permission from effective permissions
  const getResourcePermission = (resource: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    const perm = effectivePermissions.find(p => p.resource === resource);
    if (!perm) return false;
    
    switch (action) {
      case 'view': return perm.can_view;
      case 'create': return perm.can_create;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  };

  const permissions = useMemo((): RolePermissions => {
    // If we have effective permissions from DB, use those
    if (effectivePermissions.length > 0) {
      return {
        canViewDashboard: getResourcePermission('dashboard', 'view'),
        canViewChats: getResourcePermission('chats', 'view'),
        canSendMessages: getResourcePermission('chats', 'create'),
        canDeleteMessages: getResourcePermission('chats', 'delete'),
        canViewContacts: getResourcePermission('contacts', 'view'),
        canEditContacts: getResourcePermission('contacts', 'edit'),
        canDeleteContacts: getResourcePermission('contacts', 'delete'),
        canViewCampaigns: getResourcePermission('campaigns', 'view'),
        canCreateCampaigns: getResourcePermission('campaigns', 'create'),
        canSendCampaigns: getResourcePermission('campaigns', 'create'),
        canViewReports: getResourcePermission('reports', 'view'),
        canViewFinancialReports: getResourcePermission('financial_reports', 'view'),
        canManageIntegrations: getResourcePermission('integrations', 'edit'),
        canManageUsers: getResourcePermission('users', 'edit'),
        canAccessSettings: getResourcePermission('settings', 'view'),
        canCreateTickets: getResourcePermission('tickets', 'create'),
        canDeleteTickets: getResourcePermission('tickets', 'delete'),
        canViewAllTickets: getResourcePermission('tickets', 'view'),
        canManageCategories: getResourcePermission('tickets', 'edit'),
      };
    }

    // Fallback to role-based permissions if no DB permissions
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
  }, [isAdmin, isManager, isAttendant, effectivePermissions]);

  const loading = authLoading || permissionsLoading;

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
