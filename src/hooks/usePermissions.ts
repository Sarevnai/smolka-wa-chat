import { useMemo, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { AppFunction, FunctionPermissions } from '@/types/functions';
import { supabase } from '@/integrations/supabase/client';

interface EffectivePermission {
  resource: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  is_custom: boolean;
}

export function usePermissions(): FunctionPermissions & { 
  functions: AppFunction[];
  hasFunction: (func: AppFunction) => boolean;
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

    if (!user?.id || authLoading) {
      setPermissionsLoading(false);
      return;
    }

    // Initial fetch
    fetchEffectivePermissions();

    // Subscribe to changes in user_permissions
    const userPermissionsChannel = supabase
      .channel(`user-permissions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_permissions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('🔄 Permissões do usuário atualizadas, refazendo fetch...');
          fetchEffectivePermissions();
        }
      )
      .subscribe();

    // Subscribe to changes in function_permissions (affects all users with that function)
    const functionPermissionsChannel = supabase
      .channel(`function-permissions-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'function_permissions',
        },
        () => {
          console.log('🔄 Permissões de função atualizadas, refazendo fetch...');
          fetchEffectivePermissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(userPermissionsChannel);
      supabase.removeChannel(functionPermissionsChannel);
    };
  }, [user?.id, authLoading]);

  const functions = useMemo(() => {
    return profile?.roles || []; // roles is still stored in profile but we call it functions in the API
  }, [profile]);

  const hasFunction = (func: AppFunction) => functions.includes(func);
  const isAdmin = hasFunction('admin');
  const isManager = hasFunction('manager');
  const isAttendant = hasFunction('attendant');

  // Resource name aliases to match DB schema
  const RESOURCE_ALIASES: Record<string, string> = {
    'chats': 'messages',
    // Add more aliases as needed
  };

  // Helper to get permission from effective permissions
  const getResourcePermission = (resource: string, action: 'view' | 'create' | 'edit' | 'delete'): boolean => {
    // Try original resource name first
    let perm = effectivePermissions.find(p => p.resource === resource);
    
    // If not found, try alias
    if (!perm && RESOURCE_ALIASES[resource]) {
      perm = effectivePermissions.find(p => p.resource === RESOURCE_ALIASES[resource]);
    }
    
    if (!perm) return false;
    
    switch (action) {
      case 'view': return perm.can_view;
      case 'create': return perm.can_create;
      case 'edit': return perm.can_edit;
      case 'delete': return perm.can_delete;
      default: return false;
    }
  };

  const permissions = useMemo((): FunctionPermissions => {
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

    // Fallback to function-based permissions if no DB permissions
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
    functions,
    hasFunction,
    isAdmin,
    isManager,
    isAttendant,
    loading,
  };
}
