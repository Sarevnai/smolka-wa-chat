import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function usePinnedConversations() {
  const [pinnedConversations, setPinnedConversations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadPinnedConversations = async () => {
    if (!user) {
      setPinnedConversations([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch by conversation_id for proper isolation
      const { data, error } = await supabase
        .from('pinned_conversations')
        .select('phone_number')
        .eq('user_id', user.id);

      if (error) throw error;

      // phone_number column stores conversationId now (for backward compatibility, column name unchanged)
      setPinnedConversations(data?.map(p => p.phone_number) || []);
    } catch (error) {
      console.error('Error loading pinned conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (conversationId: string) => {
    if (!user) return;

    const isPinnedNow = pinnedConversations.includes(conversationId);

    try {
      if (isPinnedNow) {
        const { error } = await supabase
          .from('pinned_conversations')
          .delete()
          .eq('user_id', user.id)
          .eq('phone_number', conversationId);

        if (error) throw error;

        setPinnedConversations(prev => prev.filter(p => p !== conversationId));
        toast({
          title: "Conversa desafixada",
          description: "A conversa foi removida dos favoritos."
        });
      } else {
        const { error } = await supabase
          .from('pinned_conversations')
          .insert({
            user_id: user.id,
            phone_number: conversationId
          });

        if (error) throw error;

        setPinnedConversations(prev => [...prev, conversationId]);
        toast({
          title: "Conversa fixada",
          description: "A conversa foi adicionada aos favoritos."
        });
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status da conversa.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadPinnedConversations();
  }, [user]);

  return {
    pinnedConversations,
    loading,
    togglePin,
    isPinned: (conversationId: string) => pinnedConversations.includes(conversationId)
  };
}
