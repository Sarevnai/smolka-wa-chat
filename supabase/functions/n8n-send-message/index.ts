import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Find active conversation for a phone number
 */
async function findActiveConversation(phoneNumber: string): Promise<string | null> {
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
      console.error('[n8n-send-message] Error finding conversation:', error);
      return null;
    }
    return data?.id || null;
  } catch (error) {
    console.error('[n8n-send-message] Error in findActiveConversation:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, api_key, conversation_id } = await req.json();

    console.log('[n8n-send-message] Received request:', { to, messageLength: message?.length, conversation_id });

    // Validate required fields
    if (!to || !message || !api_key) {
      console.error('[n8n-send-message] Missing required fields');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, message, api_key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'n8n_api_key')
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('[n8n-send-message] API key not configured in system');
      return new Response(
        JSON.stringify({ success: false, error: 'API key not configured in system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle both wrapped {value: "..."} and plain string formats
    const rawApiKey = apiKeyData.setting_value as any;
    let storedApiKey: string;
    
    if (typeof rawApiKey === 'string') {
      storedApiKey = rawApiKey.replace(/^"|"$/g, '');
    } else if (rawApiKey?.value && typeof rawApiKey.value === 'string') {
      storedApiKey = rawApiKey.value;
    } else {
      console.error('[n8n-send-message] Invalid API key format in database:', typeof rawApiKey);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key format in system' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (api_key !== storedApiKey) {
      console.error('[n8n-send-message] Invalid API key provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = normalizePhoneNumber(to);
    console.log('[n8n-send-message] Normalized phone:', normalizedPhone);

    // Send message via WhatsApp
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!whatsappToken || !phoneNumberId) {
      console.error('[n8n-send-message] WhatsApp credentials not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const whatsappPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: { body: message }
    };

    console.log('[n8n-send-message] Sending to WhatsApp API');

    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(whatsappPayload),
      }
    );

    const whatsappResult = await whatsappResponse.json();
    console.log('[n8n-send-message] WhatsApp API response:', JSON.stringify(whatsappResult));

    if (!whatsappResponse.ok) {
      console.error('[n8n-send-message] WhatsApp API error:', whatsappResult);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to send WhatsApp message', details: whatsappResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🆕 Find or use provided conversation_id
    let finalConversationId = conversation_id;
    if (!finalConversationId) {
      finalConversationId = await findActiveConversation(normalizedPhone);
      if (finalConversationId) {
        console.log(`[n8n-send-message] 📍 Found conversation: ${finalConversationId}`);
      }
    }

    // Save message to database
    const messageData = {
      wa_message_id: whatsappResult.messages?.[0]?.id || null,
      wa_from: phoneNumberId,
      wa_to: normalizedPhone,
      wa_phone_number_id: phoneNumberId,
      direction: 'outbound',
      body: message,
      wa_timestamp: new Date().toISOString(),
      raw: { source: 'n8n-agent', whatsapp_response: whatsappResult },
      conversation_id: finalConversationId, // 🆕 Link to conversation
    };

    const { error: insertError } = await supabase
      .from('messages')
      .insert(messageData);

    if (insertError) {
      console.error('[n8n-send-message] Error saving message to database:', insertError);
    } else {
      console.log('[n8n-send-message] Message saved to database', { conversation_id: finalConversationId });
    }

    // Update conversation timestamp
    if (finalConversationId) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', finalConversationId);
    }

    // Update conversation state to mark AI as active
    const { error: stateError } = await supabase
      .from('conversation_states')
      .upsert({
        phone_number: normalizedPhone,
        is_ai_active: true,
        last_ai_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_number'
      });

    if (stateError) {
      console.error('[n8n-send-message] Error updating conversation state:', stateError);
    }

    console.log('[n8n-send-message] Success!');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: whatsappResult.messages?.[0]?.id,
        to: normalizedPhone,
        conversation_id: finalConversationId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[n8n-send-message] Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
