import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phoneNumber, 
      messageBody, 
      messageType,
      contactName,
      contactType,
      mediaUrl,
      mediaType 
    } = await req.json();

    console.log('📤 N8N Trigger called:', { phoneNumber, messageBody, messageType });

    // Get N8N webhook URL from system settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'n8n_webhook_url')
      .single();

    if (settingsError || !settings?.setting_value) {
      console.error('N8N webhook URL not configured:', settingsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'N8N webhook URL not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const webhookUrl = settings.setting_value;
    
    if (!webhookUrl || webhookUrl === '' || webhookUrl === '""') {
      console.log('⚠️ N8N webhook URL is empty, skipping trigger');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'N8N webhook URL is empty' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare payload for N8N
    const payload = {
      phone_number: phoneNumber,
      message: messageBody,
      message_type: messageType || 'text',
      contact_name: contactName || null,
      contact_type: contactType || null,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      timestamp: new Date().toISOString(),
      source: 'whatsapp',
      platform: 'lovable-crm'
    };

    console.log('🚀 Sending to N8N:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(payload));

    // Call N8N webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await n8nResponse.text();
    console.log('📥 N8N Response status:', n8nResponse.status);
    console.log('📥 N8N Response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    // Update conversation state to mark AI as active
    const { error: stateError } = await supabase
      .from('conversation_states')
      .upsert({
        phone_number: phoneNumber,
        is_ai_active: true,
        ai_started_at: new Date().toISOString(),
        last_ai_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'phone_number'
      });

    if (stateError) {
      console.error('Error updating conversation state:', stateError);
    }

    // Check if N8N returned a response message to send
    if (responseData?.response || responseData?.message) {
      const replyMessage = responseData.response || responseData.message;
      
      console.log('💬 Sending AI response via WhatsApp:', replyMessage);
      
      // Send the response via WhatsApp
      await supabase.functions.invoke('send-wa-message', {
        body: {
          to: phoneNumber,
          text: replyMessage
        }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      n8n_status: n8nResponse.status,
      data: responseData 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in n8n-trigger:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
