import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, text, interactive, template_name, language_code, components } = await req.json();

    console.log('Send message request:', { to, text, interactive });

    // Validate input
    if (!to || (!text && !interactive && !template_name)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos "to" e "text" (ou interactive ou template_name) são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get WhatsApp API credentials from secrets
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Configuração do WhatsApp não encontrada' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Make the actual API call to WhatsApp
    const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    
    let whatsappPayload: any = {
      messaging_product: 'whatsapp',
      to: to
    };

    // Add message content based on type
    if (template_name) {
      // Template message (HSM)
      whatsappPayload.type = 'template';
      whatsappPayload.template = {
        name: template_name,
        language: { code: language_code || 'pt_BR' },
        components: components || []
      };
    } else if (interactive) {
      // Interactive message
      whatsappPayload.type = 'interactive';
      whatsappPayload.interactive = interactive;
    } else {
      // Simple text message
      whatsappPayload.type = 'text';
      whatsappPayload.text = { body: text };
    }

    const response = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(whatsappPayload)
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('WhatsApp API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao enviar mensagem via WhatsApp' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Message sent successfully:', result);

    // Save the sent message to database
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const messageData = {
        wa_message_id: result.messages?.[0]?.id || null,
        wa_from: null, // Outbound message, so from is null
        wa_to: to,
        wa_phone_number_id: phoneNumberId,
        direction: 'outbound',
        body: text || `[Template: ${template_name}]`,
        wa_timestamp: new Date().toISOString(),
        raw: result,
        created_at: new Date().toISOString(),
        is_template: !!template_name || !!interactive // Mark as template if template_name or interactive
      };

      const { error: dbError } = await supabase
        .from('messages')
        .insert([messageData]);

      if (dbError) {
        console.error('Error saving message to database:', dbError);
      } else {
        console.log('Message saved to database successfully');
      }
    } catch (dbError) {
      console.error('Database save error:', dbError);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-wa-message function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});