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

      // Store original message data for potential restoration
      const originalData = {
        id: message.id,
        body: message.body,
        media_type: message.media_type,
        media_url: message.media_url,
        media_caption: message.media_caption,
        wa_timestamp: message.wa_timestamp,
        direction: message.direction,
        wa_from: message.wa_from,
        wa_to: message.wa_to
      };

      // Insert into deleted_messages table
      const { error: deleteError } = await supabase
        .from('deleted_messages')
        .insert({
          message_id: message.id,
          deleted_by: user.id,
          deletion_type: deletionType,
          original_message_data: originalData
        });

      if (deleteError) throw deleteError;

      // Log the action
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action_type: 'delete_message',
          target_table: 'messages',
          target_id: message.id.toString(),
          old_data: originalData,
          metadata: {
            deletion_type: deletionType,
            phone_number: message.wa_from || message.wa_to
          }
        });

      if (logError) console.warn('Failed to log activity:', logError);

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-messages'] });

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

      // Get deleted message data
      const { data: deletedMessage, error: fetchError } = await supabase
        .from('deleted_messages')
        .select('*')
        .eq('id', deletedMessageId)
        .eq('deleted_by', user.id)
        .single();

      if (fetchError || !deletedMessage) {
        throw new Error('Mensagem excluída não encontrada');
      }

      // Remove from deleted_messages
      const { error: removeError } = await supabase
        .from('deleted_messages')
        .delete()
        .eq('id', deletedMessageId);

      if (removeError) throw removeError;

      // Log the restoration
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action_type: 'restore_message',
          target_table: 'messages',
          target_id: deletedMessage.message_id.toString(),
          new_data: deletedMessage.original_message_data,
          metadata: {
            deletion_type: deletedMessage.deletion_type,
            restored_at: new Date().toISOString()
          }
        });

      if (logError) console.warn('Failed to log activity:', logError);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-messages'] });

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