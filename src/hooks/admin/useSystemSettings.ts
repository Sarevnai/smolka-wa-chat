import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  setting_category: string;
  description: string | null;
  updated_at: string;
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .order('setting_category', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: value,
          updated_by: currentUser.user?.id
        })
        .eq('setting_key', key);

      if (error) throw error;
      
      toast.success('Configuração atualizada com sucesso');
      await fetchSettings();
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast.error('Erro ao atualizar configuração');
    }
  };

  const getSetting = (key: string): any => {
    const setting = settings.find(s => s.setting_key === key);
    return setting?.setting_value;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSetting,
    getSetting,
    refetch: fetchSettings
  };
}
