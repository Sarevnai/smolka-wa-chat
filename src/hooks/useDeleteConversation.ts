import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDeleteConversation() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deleteConversation = async (phoneNumber: string) => {
    setIsDeleting(true);
    
    try {
      // Delete all messages for this phone number
      const { error } = await supabase
        .from('messages')
        .delete()
        .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`);

      if (error) {
        throw error;
      }

      toast({
        title: "Conversa excluída",
        description: "A conversa foi excluída com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a conversa. Tente novamente.",
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