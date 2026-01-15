import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database } from "@/integrations/supabase/types";

type DepartmentType = Database['public']['Enums']['department_type'];

export interface AIDepartmentConfig {
  id: string;
  department_code: DepartmentType;
  agent_name: string;
  tone: 'formal' | 'casual' | 'friendly' | 'professional' | 'enthusiastic' | 'helpful';
  greeting_message: string | null;
  custom_instructions: string | null;
  qualification_focus: string[];
  services: string[];
  limitations: string[];
  faqs: { question: string; answer: string }[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAIDepartmentConfigs() {
  return useQuery({
    queryKey: ['ai-department-configs'],
    queryFn: async (): Promise<AIDepartmentConfig[]> => {
      const { data, error } = await supabase
        .from('ai_department_configs')
        .select('*')
        .order('department_code');

      if (error) {
        console.error('Error fetching AI department configs:', error);
        throw error;
      }

      return (data || []).map(item => ({
        ...item,
        qualification_focus: Array.isArray(item.qualification_focus) ? item.qualification_focus : [],
        services: Array.isArray(item.services) ? item.services : [],
        limitations: Array.isArray(item.limitations) ? item.limitations : [],
        faqs: Array.isArray(item.faqs) ? item.faqs : [],
      })) as AIDepartmentConfig[];
    }
  });
}

export function useAIDepartmentConfig(departmentCode: DepartmentType | null) {
  return useQuery({
    queryKey: ['ai-department-config', departmentCode],
    queryFn: async (): Promise<AIDepartmentConfig | null> => {
      if (!departmentCode) return null;

      const { data, error } = await supabase
        .from('ai_department_configs')
        .select('*')
        .eq('department_code', departmentCode)
        .maybeSingle();

      if (error) {
        console.error('Error fetching AI department config:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        qualification_focus: Array.isArray(data.qualification_focus) ? data.qualification_focus : [],
        services: Array.isArray(data.services) ? data.services : [],
        limitations: Array.isArray(data.limitations) ? data.limitations : [],
        faqs: Array.isArray(data.faqs) ? data.faqs : [],
      } as AIDepartmentConfig;
    },
    enabled: !!departmentCode
  });
}

export function useUpdateAIDepartmentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      departmentCode, 
      updates 
    }: { 
      departmentCode: DepartmentType; 
      updates: Partial<Omit<AIDepartmentConfig, 'id' | 'department_code' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('ai_department_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('department_code', departmentCode)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-department-configs'] });
      queryClient.invalidateQueries({ queryKey: ['ai-department-config', variables.departmentCode] });
      toast.success('Configuração do departamento salva!');
    },
    onError: (error) => {
      console.error('Error updating AI department config:', error);
      toast.error('Erro ao salvar configuração');
    }
  });
}

// Department display info
export const DEPARTMENT_INFO: Record<DepartmentType, { 
  label: string; 
  icon: string; 
  description: string;
  color: string;
}> = {
  locacao: { 
    label: 'Locação', 
    icon: 'Home', 
    description: 'Atendimento para locação de imóveis',
    color: 'blue'
  },
  vendas: { 
    label: 'Vendas', 
    icon: 'ShoppingBag', 
    description: 'Atendimento para compra de imóveis',
    color: 'green'
  },
  administrativo: { 
    label: 'Administrativo', 
    icon: 'Building', 
    description: 'Atendimento para clientes existentes',
    color: 'purple'
  },
  marketing: { 
    label: 'Marketing', 
    icon: 'Megaphone', 
    description: 'Atendimento para captação de proprietários',
    color: 'orange'
  }
};
