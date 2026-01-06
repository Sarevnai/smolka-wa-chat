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
 * Find or create an active conversation for a phone number
 * @param phoneNumber - The original phone number from frontend
 * @param waId - The normalized wa_id returned by WhatsApp API (optional)
 */
async function findOrCreateConversation(
  supabase: any, 
  phoneNumber: string, 
  waId?: string
): Promise<string | null> {
  try {
    // Build query to search both phone formats
    const phonesToSearch = [phoneNumber];
    if (waId && waId !== phoneNumber) {
      phonesToSearch.push(waId);
    }
    
    console.log(`🔍 Searching conversation for phones: ${phonesToSearch.join(', ')}`);
    
    // Try to find existing active conversation
    const { data: existing, error: findError } = await supabase
      .from('conversations')
      .select('id')
      .in('phone_number', phonesToSearch)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('Error finding conversation:', findError);
    }

    if (existing) {
      console.log(`✅ Found existing conversation: ${existing.id}`);
      return existing.id;
    }

    // No existing conversation - create a new one
    console.log(`🆕 No active conversation found, creating new one...`);
    
    // Use waId (WhatsApp normalized) if available, otherwise use original phone
    const finalPhoneNumber = waId || phoneNumber;
    
    // Try to find existing contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .in('phone', phonesToSearch)
      .limit(1)
      .maybeSingle();

    const contactId = contact?.id || null;
    console.log(`📇 Contact ID: ${contactId || 'none (will be null)'}`);

    // Create new conversation
    const { data: newConv, error: createError } = await supabase
      .from('conversations')
      .insert({
        phone_number: finalPhoneNumber,
        status: 'active',
        contact_id: contactId,
        department_code: null, // Awaiting triage
        last_message_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return null;
    }

    console.log(`🆕 Created new conversation: ${newConv.id} for phone: ${finalPhoneNumber}`);
    return newConv.id;
  } catch (error) {
    console.error('Error in findOrCreateConversation:', error);
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

      // Get wa_id from WhatsApp response (normalized phone number)
      const waId = result.contacts?.[0]?.wa_id || normalizedPhone;
      console.log(`📱 WhatsApp wa_id: ${waId} (original: ${normalizedPhone})`);

      // Find or create conversation
      let finalConversationId = conversation_id;
      if (!finalConversationId) {
        finalConversationId = await findOrCreateConversation(supabase, normalizedPhone, waId);
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