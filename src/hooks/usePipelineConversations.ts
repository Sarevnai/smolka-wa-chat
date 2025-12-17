import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

export interface PipelineConversation {
  id: string;
  phone_number: string;
  stage_id: string | null;
  department_code: DepartmentType | null;
  last_message_at: string | null;
  qualification_score: number | null;
  contact: {
    id: string;
    name: string | null;
    phone: string;
    contact_type: string | null;
  } | null;
  stage: {
    id: string;
    name: string;
    color: string;
    order_index: number;
  } | null;
}

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order_index: number;
  department_code: DepartmentType;
  is_final: boolean;
  conversations: PipelineConversation[];
}

export function usePipelineConversations(departmentCode: DepartmentType | null) {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPipeline = async () => {
    if (!departmentCode) {
      setStages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load stages for this department
      const { data: stagesData, error: stagesError } = await supabase
        .from('conversation_stages')
        .select('*')
        .eq('department_code', departmentCode)
        .order('order_index');

      if (stagesError) throw stagesError;

      // Load conversations for this department
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          phone_number,
          stage_id,
          department_code,
          last_message_at,
          qualification_score,
          contact:contacts(id, name, phone, contact_type),
          stage:conversation_stages(id, name, color, order_index)
        `)
        .eq('department_code', departmentCode)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

      // Group conversations by stage
      const stagesWithConversations: PipelineStage[] = (stagesData || []).map(stage => ({
        ...stage,
        conversations: (conversationsData || [])
          .filter(conv => conv.stage_id === stage.id)
          .map(conv => ({
            ...conv,
            contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
            stage: Array.isArray(conv.stage) ? conv.stage[0] : conv.stage,
          }))
      }));

      // Add "Sem Stage" column for conversations without a stage
      const noStageConversations = (conversationsData || [])
        .filter(conv => !conv.stage_id)
        .map(conv => ({
          ...conv,
          contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
          stage: null,
        }));

      if (noStageConversations.length > 0) {
        stagesWithConversations.unshift({
          id: 'no-stage',
          name: 'Novos',
          color: '#6B7280',
          order_index: -1,
          department_code: departmentCode,
          is_final: false,
          conversations: noStageConversations,
        });
      }

      setStages(stagesWithConversations);
      setError(null);
    } catch (err) {
      console.error('Error loading pipeline:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar pipeline');
    } finally {
      setLoading(false);
    }
  };

  const moveConversation = async (conversationId: string, newStageId: string | null) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          stage_id: newStageId === 'no-stage' ? null : newStageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
      
      // Reload pipeline
      await loadPipeline();
      return true;
    } catch (err) {
      console.error('Error moving conversation:', err);
      return false;
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [departmentCode]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!departmentCode) return;

    const channel = supabase
      .channel(`pipeline-${departmentCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `department_code=eq.${departmentCode}`
        },
        () => {
          loadPipeline();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [departmentCode]);

  return { stages, loading, error, reload: loadPipeline, moveConversation };
}
