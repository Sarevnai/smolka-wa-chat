import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface ConversationState {
  id: string;
  phone_number: string;
  is_ai_active: boolean;
  ai_started_at: string | null;
  operator_id: string | null;
  operator_takeover_at: string | null;
  last_ai_message_at: string | null;
  last_human_message_at: string | null;
}

interface BusinessHours {
  start: string;
  end: string;
  days: number[];
  timezone: string;
}

// PHASE 2: Accept conversationId as primary identifier, with phoneNumber as fallback
export function useConversationState(conversationId: string | null, phoneNumber?: string | null) {
  const [state, setState] = useState<ConversationState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours | null>(null);
  const [resolvedPhone, setResolvedPhone] = useState<string | null>(phoneNumber || null);
  const { user } = useAuth();

  // Resolve phone number from conversationId if needed
  useEffect(() => {
    async function resolvePhone() {
      if (phoneNumber) {
        setResolvedPhone(phoneNumber);
        return;
      }
      
      if (conversationId) {
        const { data } = await supabase
          .from('conversations')
          .select('phone_number')
          .eq('id', conversationId)
          .single();
        
        if (data?.phone_number) {
          setResolvedPhone(data.phone_number);
        }
      }
    }
    
    resolvePhone();
  }, [conversationId, phoneNumber]);

  useEffect(() => {
    if (resolvedPhone) {
      fetchState();
      fetchBusinessHours();
    }
  }, [resolvedPhone]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!resolvedPhone) return;

    const channel = supabase
      .channel(`conversation-state-${resolvedPhone}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_states',
          filter: `phone_number=eq.${resolvedPhone}`
        },
        (payload) => {
          console.log('Conversation state updated:', payload);
          if (payload.new) {
            setState(payload.new as ConversationState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedPhone]);

  const fetchState = async () => {
    if (!resolvedPhone) return;

    const { data, error } = await supabase
      .from('conversation_states')
      .select('*')
      .eq('phone_number', resolvedPhone)
      .maybeSingle();

    if (error) {
      console.error('Error fetching conversation state:', error);
      return;
    }

    setState(data);
  };

  const fetchBusinessHours = async () => {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'business_hours')
      .single();

    if (!error && data?.setting_value) {
      setBusinessHours(data.setting_value as unknown as BusinessHours);
    }
  };

  const isWithinBusinessHours = (): boolean => {
    if (!businessHours) return true; // Default to business hours if not configured

    const now = new Date();
    const currentDay = now.getDay();
    
    // Check if current day is a business day
    if (!businessHours.days.includes(currentDay)) {
      return false;
    }

    // Parse business hours
    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    return currentTime >= startTime && currentTime <= endTime;
  };

  const takeoverConversation = async () => {
    if (!resolvedPhone || !user) return;

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('conversation_states')
        .upsert({
          phone_number: resolvedPhone,
          is_ai_active: false,
          operator_id: user.id,
          operator_takeover_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'phone_number'
        });

      if (error) throw error;

      toast.success('Você assumiu o atendimento desta conversa');
      await fetchState();
    } catch (error) {
      console.error('Error taking over conversation:', error);
      toast.error('Erro ao assumir conversa');
    } finally {
      setIsLoading(false);
    }
  };

  const releaseToAI = async () => {
    if (!resolvedPhone) return;

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('conversation_states')
        .upsert({
          phone_number: resolvedPhone,
          is_ai_active: true,
          operator_id: null,
          operator_takeover_at: null,
          ai_started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'phone_number'
        });

      if (error) throw error;

      toast.success('Conversa liberada para o agente IA');
      await fetchState();
    } catch (error) {
      console.error('Error releasing to AI:', error);
      toast.error('Erro ao liberar conversa');
    } finally {
      setIsLoading(false);
    }
  };

  const markHumanMessage = async () => {
    if (!resolvedPhone || !user) return;

    // Auto-takeover when human sends a message
    const { error } = await supabase
      .from('conversation_states')
      .upsert({
        phone_number: resolvedPhone,
        is_ai_active: false,
        operator_id: user.id,
        operator_takeover_at: new Date().toISOString(),
        last_human_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_number'
      });

    if (error) {
      console.error('Error marking human message:', error);
    }
  };

  return {
    state,
    isLoading,
    isAIActive: state?.is_ai_active ?? false,
    operatorId: state?.operator_id,
    isWithinBusinessHours,
    businessHours,
    takeoverConversation,
    releaseToAI,
    markHumanMessage,
    refetch: fetchState
  };
}
