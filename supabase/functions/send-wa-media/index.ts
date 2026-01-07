import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Find active conversation for a phone number
 */
async function findActiveConversation(supabase: any, phoneNumber: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone_number', phoneNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error finding conversation:', error);
      return null;
    }
    return data?.id || null;
  } catch (error) {
    console.error('Error in findActiveConversation:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, mediaUrl, mediaType, caption, filename, body: messageBody, conversation_id } = await req.json();

    if (!to || !mediaUrl || !mediaType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, mediaUrl, mediaType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = to.replace(/\D/g, '');
    console.log(`Sending media to ${normalizedPhone}:`, { mediaUrl, mediaType, filename, conversation_id });

    // Determine media type for WhatsApp API
    let waMediaType = 'document';
    if (mediaType.startsWith('image/')) {
      waMediaType = 'image';
    } else if (mediaType.startsWith('video/')) {
      waMediaType = 'video';
    } else if (mediaType.startsWith('audio/')) {
      waMediaType = 'audio';
    }

    // Prepare message payload
    const messagePayload: any = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: waMediaType,
      [waMediaType]: {
        link: mediaUrl
      }
    };

    // Add caption for supported media types
    if ((waMediaType === 'image' || waMediaType === 'video' || waMediaType === 'document') && caption) {
      messagePayload[waMediaType].caption = caption;
    }

    // Add filename for documents
    if (waMediaType === 'document' && filename) {
      messagePayload[waMediaType].filename = filename;
    }

    // Send via WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send media', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Media sent successfully:', result);

    // Store message in database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 🆕 Find or use provided conversation_id
    let finalConversationId = conversation_id;
    if (!finalConversationId) {
      finalConversationId = await findActiveConversation(supabase, normalizedPhone);
      if (finalConversationId) {
        console.log(`📍 Found conversation for media message: ${finalConversationId}`);
      }
    }

    // For audio messages, use messageBody to preserve conversation context
    const bodyText = messageBody || caption || null;
    
    const { error: dbError } = await supabase.from('messages').insert({
      wa_message_id: result.messages[0]?.id,
      wa_from: null,
      wa_to: normalizedPhone,
      wa_phone_number_id: phoneNumberId,
      direction: 'outbound',
      body: bodyText,
      wa_timestamp: new Date().toISOString(),
      media_type: mediaType,
      media_url: mediaUrl,
      media_caption: caption || null,
      media_filename: filename || null,
      media_mime_type: mediaType,
      raw: result,
      conversation_id: finalConversationId, // 🆕 Link to conversation
    });

    if (dbError) {
      console.error('Database error:', dbError);
    } else {
      console.log('Media message saved to database', { conversation_id: finalConversationId });
    }

    // 🆕 Update conversation timestamp
    if (finalConversationId) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', finalConversationId);
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.messages[0]?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-wa-media function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});