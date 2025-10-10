import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { MessageRow } from '@/lib/messages';

interface UseRealtimeMessagesProps {
  currentConversation?: string | null;
}

/**
 * Hook simplificado para notificações sonoras globais de novas mensagens.
 * NÃO deve ser usado para atualizar UI - cada componente deve ter seu próprio listener.
 */
export function useRealtimeMessages({ 
  currentConversation 
}: UseRealtimeMessagesProps) {
  const { playNotificationSound } = useNotificationSound();
  const lastMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('🔔 Configurando listener global de notificações sonoras');
    
    const channel = supabase
      .channel('global-sound-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          
          // Evitar notificações duplicadas
          if (lastMessageIdRef.current === newMessage.id) {
            return;
          }
          lastMessageIdRef.current = newMessage.id;

          // Tocar som apenas para mensagens inbound que não sejam da conversa atual
          if (newMessage.direction === 'inbound') {
            const messageFrom = (newMessage.wa_from || '').replace(/\D/g, '');
            const currentPhone = (currentConversation || '').replace(/\D/g, '');
            
            // Tocar som se não estiver na conversa atual ou janela não estiver focada
            if (!currentConversation || messageFrom !== currentPhone || !document.hasFocus()) {
              console.log('🔊 Tocando som de notificação para mensagem de:', messageFrom);
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Removendo listener global de notificações sonoras');
      supabase.removeChannel(channel);
    };
  }, [currentConversation, playNotificationSound]);

  return { playNotificationSound };
}