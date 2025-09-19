import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TypingState {
  isTyping: boolean;
  phoneNumber?: string;
  lastActivity: Date;
}

export function useTypingIndicator(phoneNumber: string) {
  const [typingState, setTypingState] = useState<TypingState>({
    isTyping: false,
    lastActivity: new Date()
  });

  // Send typing indicator
  const startTyping = useCallback(async () => {
    try {
      const channel = supabase.channel(`typing-${phoneNumber}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: {
          phoneNumber,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [phoneNumber]);

  const stopTyping = useCallback(async () => {
    try {
      const channel = supabase.channel(`typing-${phoneNumber}`);
      await channel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: {
          phoneNumber,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error stopping typing indicator:', error);
    }
  }, [phoneNumber]);

  // Listen for typing indicators
  useEffect(() => {
    const channel = supabase
      .channel(`typing-${phoneNumber}`)
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        const data = payload.payload;
        if (data.phoneNumber !== phoneNumber) return;
        
        setTypingState({
          isTyping: true,
          phoneNumber: data.phoneNumber,
          lastActivity: new Date(data.timestamp)
        });
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        const data = payload.payload;
        if (data.phoneNumber !== phoneNumber) return;
        
        setTypingState(prev => ({
          ...prev,
          isTyping: false
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phoneNumber]);

  // Auto-stop typing after 3 seconds of inactivity
  useEffect(() => {
    if (!typingState.isTyping) return;

    const timeout = setTimeout(() => {
      setTypingState(prev => ({
        ...prev,
        isTyping: false
      }));
    }, 3000);

    return () => clearTimeout(timeout);
  }, [typingState.lastActivity, typingState.isTyping]);

  return {
    isTyping: typingState.isTyping,
    startTyping,
    stopTyping
  };
}