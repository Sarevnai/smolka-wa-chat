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
      const { data, error } = await supabase
        .from('pinned_conversations')
        .select('phone_number')
        .eq('user_id', user.id);

      if (error) throw error;

      setPinnedConversations(data?.map(p => p.phone_number) || []);
    } catch (error) {
      console.error('Error loading pinned conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePin = async (phoneNumber: string) => {
    if (!user) return;

    const isPinned = pinnedConversations.includes(phoneNumber);

    try {
      if (isPinned) {
        const { error } = await supabase
          .from('pinned_conversations')
          .delete()
          .eq('user_id', user.id)
          .eq('phone_number', phoneNumber);

        if (error) throw error;

        setPinnedConversations(prev => prev.filter(p => p !== phoneNumber));
        toast({
          title: "Conversa desafixada",
          description: "A conversa foi removida dos favoritos."
        });
      } else {
        const { error } = await supabase
          .from('pinned_conversations')
          .insert({
            user_id: user.id,
            phone_number: phoneNumber
          });

        if (error) throw error;

        setPinnedConversations(prev => [...prev, phoneNumber]);
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
    isPinned: (phoneNumber: string) => pinnedConversations.includes(phoneNumber)
  };
}