import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendViaMAkePayload {
  to: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  caption?: string;
  filename?: string;
  conversation_id?: string;
  attendant_name?: string;
  department?: string;
}

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove leading zeros
  cleaned = cleaned.replace(/^0+/, '');
  
  // Add Brazil country code if missing
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  return cleaned;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('📤 [send-via-make] Received request');

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('❌ [send-via-make] Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('❌ [send-via-make] JWT validation failed:', claimsError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('👤 [send-via-make] User authenticated:', userId);

    // Parse request body
    const payload: SendViaMAkePayload = await req.json();
    console.log('📦 [send-via-make] Payload:', JSON.stringify(payload, null, 2));

    // Validate required fields
    if (!payload.to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo "to" é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!payload.text && !payload.mediaUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Envie um texto ou mídia' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(payload.to);
    console.log('📱 [send-via-make] Normalized phone:', normalizedPhone);

    // Get Make webhook URL
    const makeWebhookUrl = Deno.env.get('MAKE_OUTBOUND_WEBHOOK_URL');
    if (!makeWebhookUrl) {
      console.error('❌ [send-via-make] MAKE_OUTBOUND_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook Make não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine message type and content
    const isMedia = Boolean(payload.mediaUrl);
    const messageBody = isMedia 
      ? (payload.caption || payload.text || `[${payload.mediaType || 'Arquivo'}]`)
      : payload.text;

    // 1. Insert message into database FIRST (for consistency with existing flow)
    const now = new Date().toISOString();
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        wa_from: null, // Outbound message
        wa_to: normalizedPhone,
        body: messageBody,
        direction: 'outbound',
        wa_timestamp: now,
        created_at: now,
        conversation_id: payload.conversation_id || null,
        department_code: payload.department || null,
        media_url: payload.mediaUrl || null,
        media_type: payload.mediaType || null,
        media_mime_type: payload.mediaType || null,
        media_caption: payload.caption || null,
        media_filename: payload.filename || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ [send-via-make] Error inserting message:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao registrar mensagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [send-via-make] Message inserted:', insertedMessage.id);

    // 2. Update conversation's last_message_at
    if (payload.conversation_id) {
      await supabase
        .from('conversations')
        .update({ last_message_at: now, updated_at: now })
        .eq('id', payload.conversation_id);
    }

    // 3. Send to Make.com webhook
    const makePayload = {
      action: 'send_message',
      phone: normalizedPhone,
      message: payload.text || null,
      media_url: payload.mediaUrl || null,
      media_type: payload.mediaType || null,
      caption: payload.caption || null,
      filename: payload.filename || null,
      attendant: payload.attendant_name || null,
      department: payload.department || null,
      conversation_id: payload.conversation_id || null,
      message_id: insertedMessage.id,
      timestamp: now,
    };

    console.log('🚀 [send-via-make] Sending to Make.com:', JSON.stringify(makePayload, null, 2));

    const makeResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(makePayload),
    });

    if (!makeResponse.ok) {
      const errorText = await makeResponse.text();
      console.error('❌ [send-via-make] Make.com error:', makeResponse.status, errorText);
      
      // Message is already in DB, so we return partial success
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: 'Mensagem registrada, mas erro ao enviar via Make',
          message_id: insertedMessage.id,
          make_error: errorText
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const makeResult = await makeResponse.text();
    console.log('✅ [send-via-make] Make.com response:', makeResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: insertedMessage.id,
        make_response: makeResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [send-via-make] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
