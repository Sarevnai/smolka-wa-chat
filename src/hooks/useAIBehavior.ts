import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import type { 
  AIBehaviorConfig, 
  EssentialQuestion, 
  AIFunction,
  VisitSchedule 
} from '@/types/ai-behavior';

export function useAIBehaviorConfig() {
  return useQuery({
    queryKey: ['ai-behavior-config'],
    queryFn: async (): Promise<AIBehaviorConfig | null> => {
      const { data, error } = await supabase
        .from('ai_behavior_config')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        throw error;
      }

      return {
        id: data.id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        essential_questions: (data.essential_questions as unknown as EssentialQuestion[]) || [],
        functions: (data.functions as unknown as AIFunction[]) || [],
        reengagement_hours: data.reengagement_hours || 6,
        send_cold_leads: data.send_cold_leads || false,
        require_cpf_for_visit: data.require_cpf_for_visit || false,
        visit_schedule: (data.visit_schedule as unknown as VisitSchedule) || {},
      };
    },
  });
}

export function useUpdateEssentialQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configId, 
      questions 
    }: { 
      configId: string; 
      questions: EssentialQuestion[] 
    }) => {
      const { error } = await supabase
        .from('ai_behavior_config')
        .update({ essential_questions: questions as unknown as Json })
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-behavior-config'] });
      toast.success('Perguntas atualizadas com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar perguntas');
    },
  });
}

export function useUpdateAIFunction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configId, 
      functionId, 
      enabled,
      config 
    }: { 
      configId: string; 
      functionId: string;
      enabled: boolean;
      config?: Record<string, unknown>;
    }) => {
      // First get current functions
      const { data: currentConfig, error: fetchError } = await supabase
        .from('ai_behavior_config')
        .select('functions')
        .eq('id', configId)
        .single();

      if (fetchError) throw fetchError;

      const functions = (currentConfig.functions as unknown as AIFunction[]) || [];
      const updatedFunctions = functions.map(f => 
        f.id === functionId 
          ? { ...f, enabled, config: config ?? f.config }
          : f
      );

      const { error } = await supabase
        .from('ai_behavior_config')
        .update({ functions: updatedFunctions as unknown as Json })
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-behavior-config'] });
      toast.success('Função atualizada com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar função');
    },
  });
}

export function useUpdateVisitSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configId, 
      schedule 
    }: { 
      configId: string; 
      schedule: VisitSchedule 
    }) => {
      const { error } = await supabase
        .from('ai_behavior_config')
        .update({ visit_schedule: schedule as unknown as Json })
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-behavior-config'] });
      toast.success('Horários atualizados com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao atualizar horários');
    },
  });
}

export function useUpdateReengagementHours() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      configId, 
      hours 
    }: { 
      configId: string; 
      hours: number 
    }) => {
      const { error } = await supabase
        .from('ai_behavior_config')
        .update({ reengagement_hours: hours })
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-behavior-config'] });
      toast.success('Tempo de reengajamento atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar tempo de reengajamento');
    },
  });
}
