import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AppRole } from '@/types/roles';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string;
  user_code: number;
  roles: AppRole[];
  avatar_url?: string | null;
}

export function useUserProfiles() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchProfiles() {
      if (!user) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      try {
        // Fetch all profiles
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, user_id, full_name, username, user_code, avatar_url')
          .order('full_name');

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          return;
        }

        // Fetch all user roles
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');

        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
        }

        // Combine profiles with roles
        const profilesWithRoles = profilesData?.map(profile => ({
          ...profile,
          roles: rolesData?.filter(r => r.user_id === profile.user_id).map(r => r.role as AppRole) || [],
        })) || [];

        setProfiles(profilesWithRoles);
      } catch (error) {
        console.error('Error fetching profiles:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProfiles();
  }, [user]);

  return { profiles, loading };
}