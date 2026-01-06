import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useDeleteConversation() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteConversation = async (phoneNumber: string, conversationId?: string) => {
    if (!phoneNumber) {
      toast({
        title: "Erro",
        description: "Número de telefone inválido.",
        variant: "destructive",
      });
      return { success: false, error: 'Invalid phone number' };
    }

    setIsDeleting(true);
    
    try {
      console.log('Deleting conversation for phone:', phoneNumber, 'conversationId:', conversationId);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Get conversation_id if not provided
      let targetConversationId = conversationId;
      if (!targetConversationId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('phone_number', phoneNumber)
          .single();
        targetConversationId = conv?.id;
      }

      let messagesDeleted = 0;

      // Delete messages by conversation_id if available
      if (targetConversationId) {
        const { count, error: msgError } = await supabase
          .from('messages')
          .delete({ count: 'exact' })
          .eq('conversation_id', targetConversationId);

        if (msgError) {
          console.error('Error deleting messages by conversation_id:', msgError);
          throw new Error(`Erro ao excluir mensagens: ${msgError.message}`);
        }
        messagesDeleted = count || 0;
      } else {
        // Fallback: delete by phone number if no conversation_id
        const [fromResult, toResult] = await Promise.all([
          supabase.from('messages').delete({ count: 'exact' }).eq('wa_from', phoneNumber),
          supabase.from('messages').delete({ count: 'exact' }).eq('wa_to', phoneNumber)
        ]);

        if (fromResult.error) throw new Error(`Erro ao excluir mensagens: ${fromResult.error.message}`);
        if (toResult.error) throw new Error(`Erro ao excluir mensagens: ${toResult.error.message}`);
        
        messagesDeleted = (fromResult.count || 0) + (toResult.count || 0);
      }

      console.log(`Successfully deleted ${messagesDeleted} messages`);

      // Delete the conversation record itself
      if (targetConversationId) {
        const { error: convError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', targetConversationId);

        if (convError) {
          console.error('Error deleting conversation:', convError);
          throw new Error(`Erro ao excluir conversa: ${convError.message}`);
        }
        console.log('Successfully deleted conversation record:', targetConversationId);
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone', phoneNumber] });

      toast({
        title: "Conversa excluída",
        description: `Conversa e ${messagesDeleted} mensagem(ns) foram excluídas.`,
      });

      return { success: true, deletedCount: messagesDeleted };
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      
      const errorMessage = error?.message || 'Erro desconhecido';
      toast({
        title: "Erro ao excluir",
        description: `Não foi possível excluir a conversa: ${errorMessage}`,
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteConversation,
    isDeleting,
  };
}