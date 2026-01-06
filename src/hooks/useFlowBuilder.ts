import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AIFlow, CustomFlowNode, CustomFlowEdge } from '@/types/flow';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';

interface DbFlow {
  id: string;
  name: string;
  description: string | null;
  department_code: 'locacao' | 'administrativo' | 'vendas' | 'marketing';
  nodes: Json;
  edges: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const mapDbToFlow = (dbFlow: DbFlow): AIFlow => ({
  id: dbFlow.id,
  name: dbFlow.name,
  description: dbFlow.description || undefined,
  department: dbFlow.department_code,
  nodes: (dbFlow.nodes as unknown as CustomFlowNode[]) || [],
  edges: (dbFlow.edges as unknown as CustomFlowEdge[]) || [],
  isActive: dbFlow.is_active,
  createdAt: dbFlow.created_at,
  updatedAt: dbFlow.updated_at,
});

export function useFlowBuilder() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentFlow, setCurrentFlow] = useState<AIFlow | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Listar fluxos
  const { data: flows = [], isLoading: isLoadingFlows, refetch: refetchFlows } = useQuery({
    queryKey: ['ai-flows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_flows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as DbFlow[]).map(mapDbToFlow);
    },
  });

  // Carregar fluxo específico
  const loadFlow = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('ai_flows')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      toast.error('Erro ao carregar fluxo');
      throw error;
    }

    if (!data) {
      toast.error('Fluxo não encontrado');
      return null;
    }

    const flow = mapDbToFlow(data as DbFlow);
    setCurrentFlow(flow);
    setHasUnsavedChanges(false);
    return flow;
  }, []);

  // Criar novo fluxo
  const createFlowMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      description?: string; 
      department: AIFlow['department'];
      nodes?: CustomFlowNode[];
      edges?: CustomFlowEdge[];
    }) => {
      const { data: newFlow, error } = await supabase
        .from('ai_flows')
        .insert({
          name: data.name,
          description: data.description,
          department_code: data.department,
          nodes: (data.nodes || []) as unknown as Json,
          edges: (data.edges || []) as unknown as Json,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToFlow(newFlow as DbFlow);
    },
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] });
      setCurrentFlow(flow);
      setHasUnsavedChanges(false);
      toast.success('Fluxo criado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao criar fluxo');
    },
  });

  // Salvar fluxo
  const saveFlowMutation = useMutation({
    mutationFn: async (flow: AIFlow) => {
      const { error } = await supabase
        .from('ai_flows')
        .update({
          name: flow.name,
          description: flow.description,
          nodes: flow.nodes as unknown as Json,
          edges: flow.edges as unknown as Json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', flow.id);

      if (error) throw error;
      return flow;
    },
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] });
      setCurrentFlow(flow);
      setHasUnsavedChanges(false);
      toast.success('Fluxo salvo com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao salvar fluxo');
    },
  });

  // Publicar/Ativar fluxo
  const publishFlowMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      // Se ativando, desativar outros fluxos do mesmo departamento
      if (isActive && currentFlow) {
        await supabase
          .from('ai_flows')
          .update({ is_active: false })
          .eq('department_code', currentFlow.department)
          .neq('id', id);
      }

      const { error } = await supabase
        .from('ai_flows')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] });
      if (currentFlow) {
        setCurrentFlow({ ...currentFlow, isActive });
      }
      toast.success(isActive ? 'Fluxo publicado!' : 'Fluxo despublicado');
    },
    onError: () => {
      toast.error('Erro ao publicar fluxo');
    },
  });

  // Excluir fluxo
  const deleteFlowMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] });
      setCurrentFlow(null);
      toast.success('Fluxo excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir fluxo');
    },
  });

  // Duplicar fluxo
  const duplicateFlowMutation = useMutation({
    mutationFn: async (id: string) => {
      const flow = flows.find(f => f.id === id);
      if (!flow) throw new Error('Fluxo não encontrado');

      const { data: newFlow, error } = await supabase
        .from('ai_flows')
        .insert({
          name: `${flow.name} (cópia)`,
          description: flow.description,
          department_code: flow.department,
          nodes: flow.nodes as unknown as Json,
          edges: flow.edges as unknown as Json,
          is_active: false,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return mapDbToFlow(newFlow as DbFlow);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-flows'] });
      toast.success('Fluxo duplicado com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao duplicar fluxo');
    },
  });

  // Atualizar nós e arestas localmente
  const updateNodes = useCallback((nodes: CustomFlowNode[]) => {
    if (currentFlow) {
      setCurrentFlow({ ...currentFlow, nodes });
      setHasUnsavedChanges(true);
    }
  }, [currentFlow]);

  const updateEdges = useCallback((edges: CustomFlowEdge[]) => {
    if (currentFlow) {
      setCurrentFlow({ ...currentFlow, edges });
      setHasUnsavedChanges(true);
    }
  }, [currentFlow]);

  const updateFlowName = useCallback((name: string) => {
    if (currentFlow) {
      setCurrentFlow({ ...currentFlow, name });
      setHasUnsavedChanges(true);
    }
  }, [currentFlow]);

  // Criar novo fluxo vazio
  const createNewFlow = useCallback(() => {
    setCurrentFlow(null);
    setHasUnsavedChanges(false);
  }, []);

  return {
    // State
    currentFlow,
    flows,
    isLoadingFlows,
    hasUnsavedChanges,

    // Actions
    loadFlow,
    createFlow: createFlowMutation.mutateAsync,
    saveFlow: () => currentFlow && saveFlowMutation.mutateAsync(currentFlow),
    publishFlow: publishFlowMutation.mutateAsync,
    deleteFlow: deleteFlowMutation.mutateAsync,
    duplicateFlow: duplicateFlowMutation.mutateAsync,
    createNewFlow,
    refetchFlows,

    // Local updates
    updateNodes,
    updateEdges,
    updateFlowName,
    setCurrentFlow,
    setHasUnsavedChanges,

    // Loading states
    isCreating: createFlowMutation.isPending,
    isSaving: saveFlowMutation.isPending,
    isPublishing: publishFlowMutation.isPending,
    isDeleting: deleteFlowMutation.isPending,
  };
}
