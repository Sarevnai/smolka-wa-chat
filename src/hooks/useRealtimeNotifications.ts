import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useDepartment } from '@/contexts/DepartmentContext';
import { getConversationDepartmentCached } from '@/hooks/useConversationDepartment';

interface NotificationData {
  id: string;
  type: 'message' | 'campaign' | 'contact' | 'integration';
  title: string;
  message: string;
  timestamp: string;
  phoneNumber?: string;
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const { toast } = useToast();
  
  // Use DepartmentContext which has safe fallbacks
  const { activeDepartment, userDepartment, isAdmin } = useDepartment();
  const effectiveDepartment = isAdmin ? activeDepartment : userDepartment;

  useEffect(() => {
    let channel: RealtimeChannel;

    if (isEnabled) {
      // Subscribe to new messages
      channel = supabase
        .channel('realtime-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: 'direction=eq.inbound'
          },
          async (payload) => {
            const message = payload.new as any;
            
            // Filter by department - only notify for same department or unassigned
            if (effectiveDepartment && message.conversation_id) {
              try {
                const msgDepartment = await getConversationDepartmentCached(message.conversation_id);
                
                // Skip notification if message is from a different department
                if (msgDepartment !== null && msgDepartment !== effectiveDepartment) {
                  console.log('🔇 Notificação visual ignorada - departamento diferente:', msgDepartment, '!=', effectiveDepartment);
                  return;
                }
              } catch (error) {
                console.error('Error checking message department:', error);
                // Continue with notification on error
              }
            }
            
            const notification: NotificationData = {
              id: message.id.toString(),
              type: 'message',
              title: 'Nova mensagem recebida',
              message: `De: ${message.wa_from}`,
              timestamp: new Date().toISOString(),
              phoneNumber: message.wa_from
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10

            // Show toast notification
            toast({
              title: notification.title,
              description: notification.message,
              duration: 5000,
            });

            // Browser notification (if permission granted)
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: 'whatsapp-message'
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'contacts'
          },
          (payload) => {
            const contact = payload.new as any;
            
            const notification: NotificationData = {
              id: contact.id,
              type: 'contact',
              title: 'Novo contato adicionado',
              message: `${contact.name || 'Sem nome'} - ${contact.phone}`,
              timestamp: new Date().toISOString()
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]);

            toast({
              title: notification.title,
              description: notification.message,
              duration: 3000,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaigns'
          },
          (payload) => {
            const campaign = payload.new as any;
            
            const notification: NotificationData = {
              id: campaign.id,
              type: 'campaign',
              title: 'Nova campanha criada',
              message: `Campanha: ${campaign.name}`,
              timestamp: new Date().toISOString()
            };

            setNotifications(prev => [notification, ...prev.slice(0, 9)]);

            toast({
              title: notification.title,
              description: notification.message,
              duration: 3000,
            });
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isEnabled, toast, effectiveDepartment]);

  // Request notification permission on first load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          toast({
            title: "Notificações ativadas",
            description: "Você receberá notificações de novas mensagens.",
          });
        }
      });
    }
  }, [toast]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const toggleNotifications = () => {
    setIsEnabled(!isEnabled);
    toast({
      title: isEnabled ? "Notificações desativadas" : "Notificações ativadas",
      description: isEnabled 
        ? "Você não receberá mais notificações em tempo real." 
        : "Notificações em tempo real foram reativadas.",
    });
  };

  return {
    notifications,
    isEnabled,
    clearNotifications,
    toggleNotifications
  };
}
