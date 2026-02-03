import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback, useMemo } from 'react';
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
  subscribeToConversation: (conversationId: string, callback: (message: MessageRow) => void) => () => void;
  isConnected: boolean;
}

const RealtimeMessagesContext = createContext<RealtimeMessagesContextType | undefined>(undefined);

interface RealtimeMessagesProviderProps {
  children: ReactNode;
  currentConversation?: string | null;
}

// Cache for deduplication - moved outside component to persist across renders
const seenMessageIdsGlobal = new Set<number>();
const MESSAGE_CACHE_SIZE = 1000;

export function RealtimeMessagesProvider({ children, currentConversation }: RealtimeMessagesProviderProps) {
  const [lastMessage, setLastMessage] = useState<MessageRow | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { playNotificationSound } = useNotificationSound();
  const { activeDepartment, isAdmin } = useDepartment();
  const { department: userDepartment } = useUserDepartment();
  
  // Use refs for values that shouldn't trigger reconnection
  const currentConversationRef = useRef(currentConversation);
  const playNotificationSoundRef = useRef(playNotificationSound);
  
  // Update refs when values change (without causing reconnection)
  useEffect(() => {
    currentConversationRef.current = currentConversation;
  }, [currentConversation]);
  
  useEffect(() => {
    playNotificationSoundRef.current = playNotificationSound;
  }, [playNotificationSound]);
  
  // Memoize effective department to prevent unnecessary recalculations
  const effectiveDepartment: DepartmentType | null = useMemo(() => {
    return isAdmin ? activeDepartment : userDepartment;
  }, [isAdmin, activeDepartment, userDepartment]);
  
  // Use ref for effectiveDepartment to avoid reconnection on department change
  const effectiveDepartmentRef = useRef(effectiveDepartment);
  useEffect(() => {
    effectiveDepartmentRef.current = effectiveDepartment;
  }, [effectiveDepartment]);
  
  // Stable refs for subscriptions (won't cause reconnection)
  const phoneSubscriptions = useRef(new Map<string, Set<(message: MessageRow) => void>>());
  const conversationSubscriptions = useRef(new Map<string, Set<(message: MessageRow) => void>>());
  const seenMessageIds = useRef(seenMessageIdsGlobal);

  // Subscribe to a specific phone number (legacy - for ChatList compatibility)
  const subscribeToPhone = useCallback((phoneNumber: string, callback: (message: MessageRow) => void) => {
    console.log('📞 Registrando callback por telefone:', phoneNumber);
    
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    if (!phoneSubscriptions.current.has(normalizedPhone)) {
      phoneSubscriptions.current.set(normalizedPhone, new Set());
    }
    
    phoneSubscriptions.current.get(normalizedPhone)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      console.log('📞 Removendo callback por telefone:', phoneNumber);
      const callbacks = phoneSubscriptions.current.get(normalizedPhone);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          phoneSubscriptions.current.delete(normalizedPhone);
        }
      }
    };
  }, []);

  // Subscribe to a specific conversation (PREFERRED - isolated by department)
  const subscribeToConversation = useCallback((conversationId: string, callback: (message: MessageRow) => void) => {
    console.log('💬 Registrando callback por conversation:', conversationId);
    
    if (!conversationSubscriptions.current.has(conversationId)) {
      conversationSubscriptions.current.set(conversationId, new Set());
    }
    
    conversationSubscriptions.current.get(conversationId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      console.log('💬 Removendo callback por conversation:', conversationId);
      const callbacks = conversationSubscriptions.current.get(conversationId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          conversationSubscriptions.current.delete(conversationId);
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
          
          // First, notify conversation-based subscribers (PREFERRED - isolated)
          const messageConvId = (newMessage as any).conversation_id;
          if (messageConvId) {
            const convCallbacks = conversationSubscriptions.current.get(messageConvId);
            if (convCallbacks && convCallbacks.size > 0) {
              console.log(`✅ [RealtimeContext] Notificando ${convCallbacks.size} callback(s) para conversa ${messageConvId}`);
              convCallbacks.forEach(callback => {
                try {
                  callback(newMessage);
                } catch (error) {
                  console.error('❌ [RealtimeContext] Erro ao executar callback de conversa:', error);
                }
              });
            }
          }
          
          // Then, also notify phone-based subscribers (legacy compatibility)
          const messageFrom = (newMessage.wa_from || '').replace(/\D/g, '');
          const messageTo = (newMessage.wa_to || '').replace(/\D/g, '');
          
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
            const callbacks = phoneSubscriptions.current.get(phone);
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
            const currentPhone = (currentConversationRef.current || '').replace(/\D/g, '');
            
            // Play sound if not in current conversation or window not focused
            if (!currentConversationRef.current || messageFrom !== currentPhone || !document.hasFocus()) {
              // Check if message belongs to user's department before playing sound
              const checkDepartmentAndPlaySound = async () => {
                const deptFilter = effectiveDepartmentRef.current;
                if (deptFilter && (newMessage as any).conversation_id) {
                  const msgDepartment = await getConversationDepartmentCached((newMessage as any).conversation_id);
                  // Only play if message is from user's department or pending triage (null)
                  if (msgDepartment === deptFilter || msgDepartment === null) {
                    console.log('🔊 [RealtimeContext] Tocando som (departamento corresponde)');
                    playNotificationSoundRef.current();
                  } else {
                    console.log('🔇 [RealtimeContext] Som não tocado (departamento diferente):', msgDepartment, '!=', deptFilter);
                  }
                } else {
                  // No department filter, play sound for all
                  console.log('🔊 [RealtimeContext] Tocando som de notificação');
                  playNotificationSoundRef.current();
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
          
          // Notify conversation-based subscribers first
          const messageConvId = (updatedMessage as any).conversation_id;
          if (messageConvId) {
            const convCallbacks = conversationSubscriptions.current.get(messageConvId);
            if (convCallbacks && convCallbacks.size > 0) {
              convCallbacks.forEach(callback => {
                try {
                  callback(updatedMessage);
                } catch (error) {
                  console.error('❌ [RealtimeContext] Erro ao executar callback de update (conversa):', error);
                }
              });
            }
          }
          
          // Notify relevant phone subscribers
          const messageFrom = (updatedMessage.wa_from || '').replace(/\D/g, '');
          const messageTo = (updatedMessage.wa_to || '').replace(/\D/g, '');
          
          const relevantPhones: string[] = [];
          if (updatedMessage.direction === 'inbound' && messageFrom) {
            relevantPhones.push(messageFrom);
          } else if (updatedMessage.direction === 'outbound' && messageTo) {
            relevantPhones.push(messageTo);
          }
          
          relevantPhones.forEach(phone => {
            const callbacks = phoneSubscriptions.current.get(phone);
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
  }, []); // Empty dependency array - channel should only be created once

  return (
    <RealtimeMessagesContext.Provider value={{ lastMessage, subscribeToPhone, subscribeToConversation, isConnected }}>
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
