// ========== WHATSAPP MESSAGING ==========
// Shared WhatsApp send functions for edge functions that use the Official API directly

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getAudioConfig, generateAudioResponse } from './audio.ts';

// ========== SEND TEXT MESSAGE ==========

export async function sendWhatsAppMessage(
  phoneNumber: string, 
  message: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!waToken || !waPhoneId) {
      console.error('WhatsApp credentials not configured');
      return { success: false };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: { body: message }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return { success: false };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false };
  }
}

// ========== SEND MEDIA MESSAGE ==========

export async function sendWhatsAppMedia(
  phoneNumber: string, 
  mediaUrl: string, 
  caption?: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!waToken || !waPhoneId) {
      console.error('WhatsApp credentials not configured');
      return { success: false };
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'image',
          image: { link: mediaUrl, caption: caption || '' }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp media API error:', error);
      return { success: false };
    }

    const data = await response.json();
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    console.error('Error sending WhatsApp media:', error);
    return { success: false };
  }
}

// ========== SEND AI RESPONSE (TEXT + OPTIONAL TTS) ==========

export async function sendAIResponse(
  supabase: any,
  phoneNumber: string,
  responseText: string,
  conversationId: string | null,
  agentName: string = 'AI'
): Promise<void> {
  const audioConfig = await getAudioConfig(supabase);
  
  const sendText = !audioConfig?.audio_enabled || 
                   audioConfig.audio_mode === 'text_only' || 
                   audioConfig.audio_mode === 'text_and_audio';
  
  const sendAudio = audioConfig?.audio_enabled && 
                    (audioConfig.audio_mode === 'audio_only' || 
                     audioConfig.audio_mode === 'text_and_audio');

  // Send text (unless audio_only mode)
  if (sendText) {
    await supabase.functions.invoke('send-wa-message', {
      body: { to: phoneNumber, text: responseText, conversation_id: conversationId }
    });
  }
  
  // Send audio (if enabled)
  if (sendAudio && audioConfig) {
    const audioResult = await generateAudioResponse(responseText, audioConfig);
    if (audioResult) {
      await supabase.functions.invoke('send-wa-media', {
        body: {
          to: phoneNumber,
          mediaUrl: audioResult.audioUrl,
          mediaType: 'audio',
          mimeType: audioResult.contentType || 'audio/mpeg',
          conversation_id: conversationId
        }
      });
    } else if (audioConfig.audio_mode === 'audio_only') {
      // Fallback to text if audio-only mode fails
      await supabase.functions.invoke('send-wa-message', {
        body: { to: phoneNumber, text: responseText, conversation_id: conversationId }
      });
    }
  }
}

// ========== SAVE AND SEND MESSAGE ==========

export async function saveAndSendMessage(
  supabase: any,
  conversationId: string | null,
  phoneNumber: string,
  body: string,
  departmentCode: string = 'vendas',
  mediaUrl?: string,
  mediaType?: string
): Promise<{ success: boolean; savedMessageId?: number; waMessageId?: string }> {
  let savedMessageId: number | null = null;
  
  // Save to database first
  if (conversationId) {
    const messageData: any = {
      conversation_id: conversationId,
      wa_from: null,
      wa_to: phoneNumber,
      direction: 'outbound',
      body,
      department_code: departmentCode
    };
    
    if (mediaUrl) {
      messageData.media_url = mediaUrl;
      messageData.media_type = mediaType || 'image/jpeg';
    }
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();
    
    if (!saveError) savedMessageId = savedMessage?.id;
  }
  
  // Send via WhatsApp with TTS support
  let waResult: { success: boolean; messageId?: string } = { success: false };
  
  if (mediaUrl) {
    waResult = await sendWhatsAppMedia(phoneNumber, mediaUrl, body);
  } else {
    // Use TTS-aware sending
    const audioConfig = await getAudioConfig(supabase);
    const sendText = !audioConfig?.audio_enabled || 
                     audioConfig.audio_mode === 'text_only' || 
                     audioConfig.audio_mode === 'text_and_audio';
    const sendAudio = audioConfig?.audio_enabled && 
                      !mediaUrl &&
                      (audioConfig.audio_mode === 'audio_only' || 
                       audioConfig.audio_mode === 'text_and_audio');

    if (sendText) {
      waResult = await sendWhatsAppMessage(phoneNumber, body);
    }
    
    if (sendAudio && audioConfig) {
      const audioResult = await generateAudioResponse(body, audioConfig);
      if (audioResult) {
        await supabase.functions.invoke('send-wa-media', {
          body: {
            to: phoneNumber,
            mediaUrl: audioResult.audioUrl,
            mediaType: 'audio',
            mimeType: 'audio/mpeg'
          }
        });
      } else if (audioConfig.audio_mode === 'audio_only') {
        waResult = await sendWhatsAppMessage(phoneNumber, body);
      }
    }
  }
  
  // Update wa_message_id
  if (waResult.success && waResult.messageId && savedMessageId) {
    await supabase.from('messages')
      .update({ wa_message_id: waResult.messageId })
      .eq('id', savedMessageId);
  }
  
  return { success: waResult.success, savedMessageId: savedMessageId || undefined, waMessageId: waResult.messageId };
}

// ========== DELAY HELPER ==========

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
