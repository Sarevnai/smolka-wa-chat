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

      // Delete all messages for this phone number (corrected syntax)
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`wa_from.eq."${phoneNumber}",wa_to.eq."${phoneNumber}"`);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone', phoneNumber] });

      toast({
        title: "Conversa excluída",
        description: "A conversa foi excluída com sucesso.",
      });

      return { success: true };
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