import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageRow } from '@/lib/messages';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useMessageActions() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const logActivity = async (
    actionType: string, 
    targetTable: string, 
    targetId: string, 
    metadata?: any
  ) => {
    if (!user) return;

    try {
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action_type: actionType,
          target_table: targetTable,
          target_id: targetId,
          metadata
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const handleReact = async (message: MessageRow, emoji: string) => {
    setIsLoading(true);
    try {
      // Implementar sistema de reações
      await logActivity('react_message', 'messages', message.id.toString(), { emoji });
      toast({
        title: "Reação adicionada",
        description: `Você reagiu com ${emoji}`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a reação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStar = async (message: MessageRow) => {
    setIsLoading(true);
    try {
      // Implementar sistema de favoritos
      await logActivity('star_message', 'messages', message.id.toString());
      toast({
        title: "Mensagem favoritada",
        description: "A mensagem foi adicionada aos favoritos",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível favoritar a mensagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePin = async (message: MessageRow) => {
    setIsLoading(true);
    try {
      // Implementar sistema de fixar mensagens
      await logActivity('pin_message', 'messages', message.id.toString());
      toast({
        title: "Mensagem fixada",
        description: "A mensagem foi fixada no chat",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fixar a mensagem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async (message: MessageRow) => {
    try {
      if (message.body) {
        await navigator.clipboard.writeText(message.body);
        await logActivity('copy_message', 'messages', message.id.toString());
        toast({
          title: "Texto copiado",
          description: "O texto da mensagem foi copiado",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto",
        variant: "destructive",
      });
    }
  };

  const handleReport = async (message: MessageRow) => {
    setIsLoading(true);
    try {
      // Implementar sistema de denúncia
      await logActivity('report_message', 'messages', message.id.toString());
      toast({
        title: "Mensagem denunciada",
        description: "A denúncia foi enviada para análise",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a denúncia",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMessage = async (message: MessageRow) => {
    // Implementar sistema de seleção de mensagens
    await logActivity('select_message', 'messages', message.id.toString());
    toast({
      title: "Mensagem selecionada",
      description: "A mensagem foi selecionada",
    });
  };

  return {
    isLoading,
    handleReact,
    handleStar,
    handlePin,
    handleCopy,
    handleReport,
    handleSelectMessage
  };
}