import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { AppFunction } from '@/types/functions';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  username: string;
  user_code: number;
  roles: AppFunction[];
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

        // Fetch all user functions
        const { data: functionsData, error: functionsError } = await supabase
          .from('user_functions')
          .select('user_id, function');

        if (functionsError) {
          console.error('Error fetching functions:', functionsError);
        }

        // Combine profiles with functions
        const profilesWithFunctions = profilesData?.map(profile => ({
          ...profile,
          roles: functionsData?.filter(r => r.user_id === profile.user_id).map(r => r.function as AppFunction) || [],
        })) || [];

        setProfiles(profilesWithFunctions);
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