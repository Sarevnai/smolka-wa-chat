import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Normalize phone number by removing all non-numeric characters
 * Example: "+55 (48) 9 9110-9003" → "554891109003"
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Find active conversation for a phone number (for outbound messages)
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, text, interactive, template_name, language_code, components, conversation_id } = await req.json();

    const normalizedPhone = normalizePhoneNumber(to);
    console.log('Send message request:', { 
      original: to, 
      normalized: normalizedPhone, 
      text, 
      interactive,
      conversation_id // 🆕 Log conversation_id if provided
    });

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
      to: normalizedPhone
    };

    // Add message content based on type
    if (template_name) {
      // Template message (HSM)
      whatsappPayload.type = 'template';
      
      // Build template components with support for named and numeric variables
      const templateComponents: any[] = [];
      
      if (components && components.length > 0) {
        console.log(`Processing ${components.length} template components`);
        
        for (const component of components) {
          if (component.type === 'header') {
            if (component.parameters) {
              // Check if header has named or numeric variables
              const hasNamedVars = component.parameters.some((p: any) => 
                p.parameter_name && !/^\d+$/.test(p.parameter_name)
              );
              
              console.log(`HEADER mode: ${hasNamedVars ? 'NAMED' : 'NUMERIC'} (${component.parameters.length} params)`);
              
              const headerParams = component.parameters.map((param: any) => {
                if (param.type === 'text') {
                  console.log(`  - ${param.parameter_name || 'numeric'}: ${param.text}`);
                  if (hasNamedVars && param.parameter_name) {
                    return { type: 'text', text: param.text, parameter_name: param.parameter_name };
                  } else {
                    return { type: 'text', text: param.text };
                  }
                }
                return param; // media or other types
              });
              
              templateComponents.push({ type: 'header', parameters: headerParams });
            }
          } else if (component.type === 'body') {
            if (component.parameters) {
              // Check if body has named or numeric variables
              const hasNamedVars = component.parameters.some((p: any) => 
                p.parameter_name && !/^\d+$/.test(p.parameter_name)
              );
              
              console.log(`BODY mode: ${hasNamedVars ? 'NAMED' : 'NUMERIC'} (${component.parameters.length} params)`);
              
              const bodyParams = component.parameters.map((param: any) => {
                console.log(`  - ${param.parameter_name || 'numeric'}: ${param.text}`);
                if (hasNamedVars && param.parameter_name) {
                  return { type: 'text', text: param.text, parameter_name: param.parameter_name };
                } else {
                  return { type: 'text', text: param.text };
                }
              });
              
              templateComponents.push({ type: 'body', parameters: bodyParams });
            }
          } else {
            // Other component types (buttons, etc.)
            templateComponents.push(component);
          }
        }
      }
      
      whatsappPayload.template = {
        name: template_name,
        language: { code: language_code || 'pt_BR' },
        components: templateComponents
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

      // 🆕 Find or use provided conversation_id
      let finalConversationId = conversation_id;
      if (!finalConversationId) {
        finalConversationId = await findActiveConversation(supabase, normalizedPhone);
        if (finalConversationId) {
          console.log(`📍 Found conversation for outbound message: ${finalConversationId}`);
        }
      }

      const messageData = {
        wa_message_id: result.messages?.[0]?.id || null,
        wa_from: null, // Outbound message, so from is null
        wa_to: normalizedPhone,
        wa_phone_number_id: phoneNumberId,
        direction: 'outbound',
        body: text || `[Template: ${template_name}]`,
        wa_timestamp: new Date().toISOString(),
        raw: result,
        created_at: new Date().toISOString(),
        is_template: !!template_name || !!interactive,
        conversation_id: finalConversationId, // 🆕 Link to conversation
      };

      const { error: dbError } = await supabase
        .from('messages')
        .insert([messageData]);

      if (dbError) {
        console.error('Error saving message to database:', dbError);
      } else {
        console.log('Message saved to database successfully', { conversation_id: finalConversationId });
      }

      // 🆕 Update conversation timestamp
      if (finalConversationId) {
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', finalConversationId);
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