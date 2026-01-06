import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MessageRow } from '@/lib/messages';
import { useNotificationSound } from '@/hooks/useNotificationSound';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useUserDepartment } from '@/hooks/useUserDepartment';
import { getConversationDepartmentCached } from '@/hooks/useConversationDepartment';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

interface RealtimeMessagesContextType {
  lastMessage: MessageRow | null;
  subscribeToPhone: (phoneNumber: string, callback: (message: MessageRow) => void) => () => void;
  isConnected: boolean;
}

const RealtimeMessagesContext = createContext<RealtimeMessagesContextType | undefined>(undefined);

interface RealtimeMessagesProviderProps {
  children: ReactNode;
  currentConversation?: string | null;
}

export function RealtimeMessagesProvider({ children, currentConversation }: RealtimeMessagesProviderProps) {
  const [lastMessage, setLastMessage] = useState<MessageRow | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { playNotificationSound } = useNotificationSound();
  const { activeDepartment, isAdmin } = useDepartment();
  const { department: userDepartment } = useUserDepartment();
  
  // Determine effective department for filtering notifications
  const effectiveDepartment: DepartmentType | null = isAdmin ? activeDepartment : userDepartment;
  
  // Use refs for stable callbacks and deduplication
  const seenMessageIds = useRef(new Set<number>());
  const subscriptions = useRef(new Map<string, Set<(message: MessageRow) => void>>());
  const MESSAGE_CACHE_SIZE = 1000;

  // Subscribe to a specific phone number
  const subscribeToPhone = useCallback((phoneNumber: string, callback: (message: MessageRow) => void) => {
    console.log('📞 Registrando callback para:', phoneNumber);
    
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    if (!subscriptions.current.has(normalizedPhone)) {
      subscriptions.current.set(normalizedPhone, new Set());
    }
    
    subscriptions.current.get(normalizedPhone)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      console.log('📞 Removendo callback para:', phoneNumber);
      const callbacks = subscriptions.current.get(normalizedPhone);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          subscriptions.current.delete(normalizedPhone);
        }
      }
    };
  }, []);

  useEffect(() => {
    console.log('🔌 [RealtimeContext] Inicializando canal global de mensagens');
    
    const channel = supabase
      .channel('global-messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          
          console.log('📨 [RealtimeContext] Nova mensagem recebida:', {
            id: newMessage.id,
            from: newMessage.wa_from,
            to: newMessage.wa_to,
            direction: newMessage.direction,
            body: newMessage.body?.substring(0, 30)
          });
          
          // Deduplication check
          if (seenMessageIds.current.has(newMessage.id)) {
            console.log('⚠️ [RealtimeContext] Mensagem duplicada ignorada:', newMessage.id);
            return;
          }
          
          seenMessageIds.current.add(newMessage.id);
          
          // Clean cache if too large
          if (seenMessageIds.current.size > MESSAGE_CACHE_SIZE) {
            const oldestIds = Array.from(seenMessageIds.current).slice(0, 100);
            oldestIds.forEach(id => seenMessageIds.current.delete(id));
            console.log('🧹 [RealtimeContext] Cache de IDs limpo');
          }
          
          // Update last message for global consumers
          setLastMessage(newMessage);
          
          // Identify relevant phone numbers
          const messageFrom = (newMessage.wa_from || '').replace(/\D/g, '');
          const messageTo = (newMessage.wa_to || '').replace(/\D/g, '');
          
          // Determine which phone number this message is relevant for
          const relevantPhones: string[] = [];
          
          if (newMessage.direction === 'inbound' && messageFrom) {
            relevantPhones.push(messageFrom);
          } else if (newMessage.direction === 'outbound' && messageTo) {
            relevantPhones.push(messageTo);
          }
          
          console.log('🎯 [RealtimeContext] Números relevantes:', relevantPhones);
          
          // Notify all subscribed callbacks for relevant phones
          let notifiedCount = 0;
          relevantPhones.forEach(phone => {
            const callbacks = subscriptions.current.get(phone);
            if (callbacks && callbacks.size > 0) {
              console.log(`✅ [RealtimeContext] Notificando ${callbacks.size} callback(s) para ${phone}`);
              callbacks.forEach(callback => {
                try {
                  callback(newMessage);
                  notifiedCount++;
                } catch (error) {
                  console.error('❌ [RealtimeContext] Erro ao executar callback:', error);
                }
              });
            }
          });
          
          console.log(`📢 [RealtimeContext] Total de callbacks notificados: ${notifiedCount}`);
          
          // Play notification sound for inbound messages (filtered by department)
          if (newMessage.direction === 'inbound') {
            const currentPhone = (currentConversation || '').replace(/\D/g, '');
            
            // Play sound if not in current conversation or window not focused
            if (!currentConversation || messageFrom !== currentPhone || !document.hasFocus()) {
              // Check if message belongs to user's department before playing sound
              const checkDepartmentAndPlaySound = async () => {
                if (effectiveDepartment && (newMessage as any).conversation_id) {
                  const msgDepartment = await getConversationDepartmentCached((newMessage as any).conversation_id);
                  // Only play if message is from user's department or pending triage (null)
                  if (msgDepartment === effectiveDepartment || msgDepartment === null) {
                    console.log('🔊 [RealtimeContext] Tocando som (departamento corresponde)');
                    playNotificationSound();
                  } else {
                    console.log('🔇 [RealtimeContext] Som não tocado (departamento diferente):', msgDepartment, '!=', effectiveDepartment);
                  }
                } else {
                  // No department filter, play sound for all
                  console.log('🔊 [RealtimeContext] Tocando som de notificação');
                  playNotificationSound();
                }
              };
              checkDepartmentAndPlaySound();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as MessageRow;
          console.log('📝 [RealtimeContext] Mensagem atualizada:', updatedMessage.id);
          
          // Update last message if needed
          setLastMessage(updatedMessage);
          
          // Notify relevant subscribers about the update
          const messageFrom = (updatedMessage.wa_from || '').replace(/\D/g, '');
          const messageTo = (updatedMessage.wa_to || '').replace(/\D/g, '');
          
          const relevantPhones: string[] = [];
          if (updatedMessage.direction === 'inbound' && messageFrom) {
            relevantPhones.push(messageFrom);
          } else if (updatedMessage.direction === 'outbound' && messageTo) {
            relevantPhones.push(messageTo);
          }
          
          relevantPhones.forEach(phone => {
            const callbacks = subscriptions.current.get(phone);
            if (callbacks && callbacks.size > 0) {
              callbacks.forEach(callback => {
                try {
                  callback(updatedMessage);
                } catch (error) {
                  console.error('❌ [RealtimeContext] Erro ao executar callback de update:', error);
                }
              });
            }
          });
        }
      )
      .subscribe((status) => {
        console.log('🔌 [RealtimeContext] Status da conexão:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('🔌 [RealtimeContext] Removendo canal global');
      supabase.removeChannel(channel);
    };
  }, [currentConversation, playNotificationSound, effectiveDepartment]);

  return (
    <RealtimeMessagesContext.Provider value={{ lastMessage, subscribeToPhone, isConnected }}>
      {children}
    </RealtimeMessagesContext.Provider>
  );
}

export function useRealtimeMessages() {
  const context = useContext(RealtimeMessagesContext);
  if (context === undefined) {
    throw new Error('useRealtimeMessages must be used within a RealtimeMessagesProvider');
  }
  return context;
}
