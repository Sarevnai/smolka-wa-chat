import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SUPABASE_PROJECT_URL } from '@/lib/supabaseClient';

// Departments that use Make.com for message routing
const MAKE_ROUTED_DEPARTMENTS = ['locacao', 'vendas', 'administrativo'];

// Departments that use direct WhatsApp API
const DIRECT_API_DEPARTMENTS = ['marketing', 'empreendimentos'];

interface SendMessageOptions {
  to: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  filename?: string;
  conversationId?: string;
  attendantName?: string;
  departmentCode?: string | null;
}

interface SendMessageResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Hook for sending messages with automatic routing based on department.
 * 
 * - Locação, Vendas, Administrativo → Make.com (send-via-make)
 * - Marketing, Empreendimentos → Direct WhatsApp API (send-wa-message/send-wa-media)
 */
export function useSendMessage() {
  const [isSending, setIsSending] = useState(false);

  /**
   * Determines if the message should be routed via Make.com
   */
  const shouldUseMake = useCallback((departmentCode?: string | null): boolean => {
    if (!departmentCode) return false;
    return MAKE_ROUTED_DEPARTMENTS.includes(departmentCode);
  }, []);

  /**
   * Send a text message
   */
  const sendTextMessage = useCallback(async (options: SendMessageOptions): Promise<SendMessageResult> => {
    const { to, text, conversationId, attendantName, departmentCode } = options;
    
    if (!text?.trim()) {
      return { success: false, error: 'Texto é obrigatório' };
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const useMake = shouldUseMake(departmentCode);
      console.log(`📤 [useSendMessage] Routing via ${useMake ? 'Make.com' : 'Direct API'} for department: ${departmentCode}`);

      if (useMake) {
        // Route via Make.com
        const { data, error } = await supabase.functions.invoke('send-via-make', {
          body: {
            to,
            text,
            conversation_id: conversationId,
            attendant_name: attendantName,
            department: departmentCode,
          }
        });

        if (error) {
          throw new Error(error.message || 'Erro ao enviar via Make');
        }

        return { success: true, messageId: data?.message_id };
      } else {
        // Route via direct WhatsApp API
        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/send-wa-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ to, text }),
        });

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Erro ao enviar mensagem');
        }

        return { success: true, messageId: result.message_id };
      }
    } catch (error) {
      console.error('❌ [useSendMessage] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      toast({
        title: 'Erro ao enviar',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  }, [shouldUseMake]);

  /**
   * Send a media message (image, document, audio, video)
   */
  const sendMediaMessage = useCallback(async (options: SendMessageOptions): Promise<SendMessageResult> => {
    const { to, mediaUrl, mediaType, caption, filename, conversationId, attendantName, departmentCode } = options;
    
    if (!mediaUrl) {
      return { success: false, error: 'URL da mídia é obrigatória' };
    }

    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const useMake = shouldUseMake(departmentCode);
      console.log(`📤 [useSendMessage] Routing media via ${useMake ? 'Make.com' : 'Direct API'} for department: ${departmentCode}`);

      if (useMake) {
        // Route via Make.com
        const { data, error } = await supabase.functions.invoke('send-via-make', {
          body: {
            to,
            mediaUrl,
            mediaType,
            caption,
            filename,
            conversation_id: conversationId,
            attendant_name: attendantName,
            department: departmentCode,
          }
        });

        if (error) {
          throw new Error(error.message || 'Erro ao enviar mídia via Make');
        }

        return { success: true, messageId: data?.message_id };
      } else {
        // Route via direct WhatsApp API
        const { data, error } = await supabase.functions.invoke('send-wa-media', {
          body: {
            to,
            mediaUrl,
            mediaType,
            caption,
            filename,
          }
        });

        if (error) {
          throw new Error(error.message || 'Erro ao enviar mídia');
        }

        return { success: true, messageId: data?.message_id };
      }
    } catch (error) {
      console.error('❌ [useSendMessage] Media error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mídia';
      toast({
        title: 'Erro ao enviar mídia',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  }, [shouldUseMake]);

  /**
   * Generic send function that auto-detects text vs media
   */
  const sendMessage = useCallback(async (options: SendMessageOptions): Promise<SendMessageResult> => {
    if (options.mediaUrl) {
      return sendMediaMessage(options);
    }
    return sendTextMessage(options);
  }, [sendTextMessage, sendMediaMessage]);

  return {
    sendMessage,
    sendTextMessage,
    sendMediaMessage,
    shouldUseMake,
    isSending,
  };
}
