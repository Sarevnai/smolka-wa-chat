import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useDeleteConversation() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteConversation = async (phoneNumber: string) => {
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
      console.log('Deleting conversation for phone:', phoneNumber);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Normalize phone number (remove special characters)
      const normalizedPhone = phoneNumber.replace(/\D/g, '');
      
      // Delete messages using two parallel operations for better reliability
      // This approach is more robust than using .or() which can have issues
      const [fromResult, toResult] = await Promise.all([
        supabase.from('messages').delete({ count: 'exact' }).eq('wa_from', phoneNumber),
        supabase.from('messages').delete({ count: 'exact' }).eq('wa_to', phoneNumber)
      ]);

      if (fromResult.error) {
        console.error('Error deleting from messages:', fromResult.error);
        throw new Error(`Erro ao excluir mensagens enviadas: ${fromResult.error.message}`);
      }

      if (toResult.error) {
        console.error('Error deleting to messages:', toResult.error);
        throw new Error(`Erro ao excluir mensagens recebidas: ${toResult.error.message}`);
      }

      const totalDeleted = (fromResult.count || 0) + (toResult.count || 0);
      console.log(`Successfully deleted ${totalDeleted} messages for phone: ${phoneNumber}`);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone', phoneNumber] });

      toast({
        title: "Conversa excluída",
        description: `${totalDeleted} mensagem(ns) foram excluídas com sucesso.`,
      });

      return { success: true, deletedCount: totalDeleted };
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