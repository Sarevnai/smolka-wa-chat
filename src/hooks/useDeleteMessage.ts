import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { MessageRow } from '@/lib/messages';

export function useDeleteMessage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMessage = async (message: MessageRow, deletionType: 'for_me' | 'for_everyone') => {
    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Call the delete-message edge function
      const { data, error } = await supabase.functions.invoke('delete-message', {
        body: {
          message_id: message.id,
          deletion_type: deletionType
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to delete message');

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast({
        title: deletionType === 'for_everyone' ? 'Mensagem excluída para todos' : 'Mensagem excluída para você',
        description: deletionType === 'for_everyone' 
          ? 'A mensagem foi removida para todos os participantes.'
          : 'A mensagem foi removida apenas da sua visualização.'
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting message:', error);
      toast({
        title: "Erro ao excluir mensagem",
        description: error.message || 'Não foi possível excluir a mensagem.',
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsDeleting(false);
    }
  };

  const restoreMessage = async (deletedMessageId: string) => {
    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Call the restore-message edge function
      const { data, error } = await supabase.functions.invoke('restore-message', {
        body: {
          deleted_message_id: deletedMessageId
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to restore message');

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });

      toast({
        title: "Mensagem restaurada",
        description: "A mensagem foi restaurada com sucesso."
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error restoring message:', error);
      toast({
        title: "Erro ao restaurar mensagem",
        description: error.message || 'Não foi possível restaurar a mensagem.',
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeletedMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('deleted_messages')
      .select('*')
      .eq('deleted_by', user.id)
      .eq('can_restore', true)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error fetching deleted messages:', error);
      return [];
    }

    return data || [];
  };

  return {
    deleteMessage,
    restoreMessage,
    getDeletedMessages,
    isDeleting,
  };
}