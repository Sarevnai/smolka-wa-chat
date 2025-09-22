import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSound } from './useNotificationSound';
import { MessageRow } from '@/lib/messages';

interface UseRealtimeMessagesProps {
  onNewMessage?: (message: MessageRow) => void;
  currentConversation?: string | null;
}

export function useRealtimeMessages({ 
  onNewMessage, 
  currentConversation 
}: UseRealtimeMessagesProps) {
  const { playNotificationSound } = useNotificationSound();
  const lastMessageIdRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('Setting up realtime messages subscription');
    
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('New message received:', payload);
          
          const newMessage = payload.new as MessageRow;
          
          // Avoid duplicate notifications
          if (lastMessageIdRef.current === newMessage.id) {
            return;
          }
          lastMessageIdRef.current = newMessage.id;

          // Call the callback
          onNewMessage?.(newMessage);

          // Play notification sound for inbound messages
          if (newMessage.direction === 'inbound') {
            // Play sound if not in the current conversation or window not focused
            if (!currentConversation || newMessage.wa_from !== currentConversation) {
              console.log('Playing notification sound for new message');
              playNotificationSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up realtime messages subscription');
      supabase.removeChannel(channel);
    };
  }, [onNewMessage, currentConversation, playNotificationSound]);

  return { playNotificationSound };
}