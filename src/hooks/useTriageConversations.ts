import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

export interface TriageConversation {
  id: string;
  phone_number: string;
  last_message_at: string | null;
  created_at: string | null;
  contact: {
    id: string;
    name: string | null;
    phone: string;
  } | null;
  lastMessage?: {
    body: string | null;
    direction: string | null;
    created_at: string | null;
  };
}

export function useTriageConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<TriageConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  const loadTriageConversations = async () => {
    if (!user) {
      setLoading(false);
      setConversations([]);
      setCount(0);
      return;
    }

    try {
      setLoading(true);

      // Load conversations without department (pending triage)
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          phone_number,
          last_message_at,
          created_at,
          contact:contacts(id, name, phone)
        `)
        .is('department_code', null)
        .eq('status', 'active')
        .order('last_message_at', { ascending: false });

      if (error) throw error;

      // Get last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conv) => {
          const { data: messages } = await supabase
            .from('messages')
            .select('body, direction, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            contact: Array.isArray(conv.contact) ? conv.contact[0] : conv.contact,
            lastMessage: messages?.[0] || null,
          };
        })
      );

      setConversations(conversationsWithMessages);
      setCount(conversationsWithMessages.length);
    } catch (err) {
      console.error('Error loading triage conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignDepartment = async (conversationId: string, departmentCode: DepartmentType) => {
    try {
      // Get first stage of department
      const { data: stages } = await supabase
        .from('conversation_stages')
        .select('id')
        .eq('department_code', departmentCode)
        .order('order_index')
        .limit(1);

      const firstStageId = stages?.[0]?.id || null;

      const { error } = await supabase
        .from('conversations')
        .update({
          department_code: departmentCode,
          stage_id: firstStageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) throw error;
      
      await loadTriageConversations();
      return true;
    } catch (err) {
      console.error('Error assigning department:', err);
      return false;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      // First delete all messages associated with this conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) throw messagesError;

      // Then delete the conversation itself
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      await loadTriageConversations();
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      return false;
    }
  };

  useEffect(() => {
    loadTriageConversations();
  }, [user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('triage-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: 'department_code=is.null'
        },
        () => {
          loadTriageConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { conversations, loading, count, reload: loadTriageConversations, assignDepartment, deleteConversation };
}
