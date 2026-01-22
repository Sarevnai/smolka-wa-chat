import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Log Outbound Message
 * 
 * This edge function is called by Make.com AFTER successfully sending a WhatsApp message.
 * It logs the outbound message to the messages table to maintain conversation history.
 * 
 * Expected payload from Make:
 * {
 *   "phone_number": "554888182882",
 *   "message_body": "Olá! Como posso ajudar?",
 *   "message_id": "wamid.xxx" (optional, WhatsApp message ID returned by API),
 *   "message_type": "text" | "template" | "interactive" | "image" | "audio",
 *   "conversation_id": "uuid" (optional),
 *   "template_name": "atualizacao" (optional, if template was sent),
 *   "media_url": "https://..." (optional, for media messages)
 * }
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const expectedKey = Deno.env.get('MAKE_API_KEY');

    if (!expectedKey || apiKey !== expectedKey) {
      console.error('❌ Invalid or missing API key');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log('📤 Logging outbound message:', JSON.stringify(body, null, 2));

    const {
      phone_number,
      message_body,
      message_id,
      message_type = 'text',
      conversation_id,
      template_name,
      media_url,
      department_code
    } = body;

    if (!phone_number) {
      return new Response(JSON.stringify({ error: 'phone_number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find conversation if not provided
    let conversationId = conversation_id;
    let convDepartment = department_code;

    if (!conversationId) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, department_code')
        .eq('phone_number', phone_number)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conversation) {
        conversationId = conversation.id;
        convDepartment = convDepartment || conversation.department_code;
        console.log(`📍 Found conversation: ${conversationId}`);
      }
    }

    // Build message data
    const messageData = {
      wa_message_id: message_id || `make_out_${Date.now()}`,
      wa_from: null,
      wa_to: phone_number,
      wa_phone_number_id: null,
      direction: 'outbound' as const,
      body: message_body || '',
      wa_timestamp: new Date().toISOString(),
      is_template: !!template_name,
      template_name: template_name || null,
      conversation_id: conversationId || null,
      department_code: convDepartment || null,
      raw: {
        source: 'make_proxy',
        message_type,
        media_url: media_url || null,
        logged_at: new Date().toISOString()
      }
    };

    // Check for duplicate (same wa_message_id)
    if (message_id) {
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('wa_message_id', message_id)
        .maybeSingle();

      if (existingMessage) {
        console.log(`⏭️ Duplicate message ${message_id} - skipping`);
        return new Response(JSON.stringify({ 
          success: true, 
          duplicate: true,
          message_id: existingMessage.id 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Insert message
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert([messageData])
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Error inserting outbound message:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Outbound message logged: ${insertedMessage.id}`);

    // Update conversation timestamp if we have one
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: insertedMessage.id,
      conversation_id: conversationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in log-outbound-message:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
