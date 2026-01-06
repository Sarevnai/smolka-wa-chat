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
 * Find best matching contact for phone numbers
 * Priority: normalizedPhone > waId
 */
async function findContact(
  supabase: any,
  normalizedPhone: string,
  waId?: string
): Promise<{ id: string; name: string | null; department_code: string | null } | null> {
  // Try normalized phone first
  const { data: contactByNormalized } = await supabase
    .from('contacts')
    .select('id, name, department_code')
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (contactByNormalized) {
    console.log(`📇 Contact found by normalizedPhone: ${contactByNormalized.id} (dept: ${contactByNormalized.department_code})`);
    return contactByNormalized;
  }

  // Try waId if different
  if (waId && waId !== normalizedPhone) {
    const { data: contactByWaId } = await supabase
      .from('contacts')
      .select('id, name, department_code')
      .eq('phone', waId)
      .maybeSingle();

    if (contactByWaId) {
      console.log(`📇 Contact found by waId: ${contactByWaId.id} (dept: ${contactByWaId.department_code})`);
      return contactByWaId;
    }
  }

  console.log(`📇 No contact found for phones: ${normalizedPhone}, ${waId || 'N/A'}`);
  return null;
}

/**
 * Find or create an active conversation for a phone number
 * Auto-heals department_code and contact_id mismatches
 */
async function findOrCreateConversation(
  supabase: any, 
  normalizedPhone: string, 
  waId: string,
  contact: { id: string; name: string | null; department_code: string | null } | null
): Promise<{ conversationId: string; canonicalPhone: string }> {
  const canonicalPhone = waId || normalizedPhone;
  
  console.log(`🔍 findOrCreateConversation:`, {
    normalizedPhone,
    waId,
    canonicalPhone,
    contactId: contact?.id,
    contactDept: contact?.department_code
  });

  // Strategy: Search by normalizedPhone first, then waId
  let existingConversation = null;

  // 1. Try normalizedPhone
  const { data: convByNormalized } = await supabase
    .from('conversations')
    .select('id, phone_number, department_code, contact_id')
    .eq('phone_number', normalizedPhone)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (convByNormalized) {
    existingConversation = convByNormalized;
    console.log(`✅ Found conversation by normalizedPhone: ${convByNormalized.id}`);
  }

  // 2. If not found, try waId
  if (!existingConversation && waId && waId !== normalizedPhone) {
    const { data: convByWaId } = await supabase
      .from('conversations')
      .select('id, phone_number, department_code, contact_id')
      .eq('phone_number', waId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convByWaId) {
      existingConversation = convByWaId;
      console.log(`✅ Found conversation by waId: ${convByWaId.id}`);
    }
  }

  // 3. Auto-heal existing conversation if needed
  if (existingConversation) {
    const updates: Record<string, any> = {};
    
    // Heal department_code if contact has one and conversation doesn't match
    if (contact?.department_code && existingConversation.department_code !== contact.department_code) {
      console.log(`🔧 Auto-healing department: ${existingConversation.department_code} → ${contact.department_code}`);
      updates.department_code = contact.department_code;
    }
    
    // Heal contact_id if different or null
    if (contact?.id && existingConversation.contact_id !== contact.id) {
      console.log(`🔧 Auto-healing contact_id: ${existingConversation.contact_id} → ${contact.id}`);
      updates.contact_id = contact.id;
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', existingConversation.id);

      if (updateError) {
        console.error('Error auto-healing conversation:', updateError);
      } else {
        console.log(`✅ Conversation auto-healed:`, updates);
      }
    }

    return { 
      conversationId: existingConversation.id, 
      canonicalPhone: existingConversation.phone_number 
    };
  }

  // 4. No existing conversation - create new one
  console.log(`🆕 Creating new conversation...`);
  
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert({
      phone_number: canonicalPhone,
      status: 'active',
      contact_id: contact?.id || null,
      department_code: contact?.department_code || null, // 🆕 Inherit from contact
      last_message_at: new Date().toISOString()
    })
    .select('id, phone_number')
    .single();

  if (createError) {
    console.error('Error creating conversation:', createError);
    throw new Error('Failed to create conversation');
  }

  console.log(`🆕 Created conversation: ${newConv.id} (phone: ${newConv.phone_number}, dept: ${contact?.department_code || 'null'})`);
  return { 
    conversationId: newConv.id, 
    canonicalPhone: newConv.phone_number 
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, text, interactive, template_name, language_code, components, conversation_id } = await req.json();

    const normalizedPhone = normalizePhoneNumber(to);
    console.log('📤 Send message request:', { 
      original: to, 
      normalized: normalizedPhone, 
      hasText: !!text,
      hasInteractive: !!interactive,
      hasTemplate: !!template_name,
      conversation_id
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

    console.log('✅ Message sent successfully:', result);

    // Save the sent message to database
    let finalConversationId: string | null = null;
    let canonicalPhone: string = normalizedPhone;

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Get wa_id from WhatsApp response (normalized phone number)
      const waId = result.contacts?.[0]?.wa_id || normalizedPhone;
      console.log(`📱 WhatsApp wa_id: ${waId} (original: ${normalizedPhone})`);

      // Find best matching contact
      const contact = await findContact(supabase, normalizedPhone, waId);

      // Find or create conversation (with auto-heal)
      if (conversation_id) {
        finalConversationId = conversation_id;
        canonicalPhone = waId || normalizedPhone;
        console.log(`📋 Using provided conversation_id: ${conversation_id}`);
      } else {
        const convResult = await findOrCreateConversation(supabase, normalizedPhone, waId, contact);
        finalConversationId = convResult.conversationId;
        canonicalPhone = convResult.canonicalPhone;
      }

      // 🆕 Build message body with template parameters for better visibility
      let messageBody = text || '';
      
      if (template_name && !text) {
        // Extract parameters from template components
        let templateParams: string[] = [];
        
        if (components && components.length > 0) {
          for (const component of components) {
            if (component.type === 'body' && component.parameters) {
              templateParams = component.parameters.map((p: any) => p.text || '').filter(Boolean);
            }
          }
        }
        
        // Format template message with parameters for readability
        if (templateParams.length > 0) {
          // For "atualizacao" template: [Nome, Endereço, Valor]
          if (template_name.toLowerCase().includes('atualizacao') && templateParams.length >= 3) {
            messageBody = `[Template: ${template_name}]\n\n` +
              `👤 Nome: ${templateParams[0]}\n` +
              `📍 Endereço: ${templateParams[1]}\n` +
              `💰 Valor: ${templateParams[2]}`;
          } else {
            // Generic format for other templates
            messageBody = `[Template: ${template_name}]\n\nParâmetros:\n${templateParams.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
          }
          console.log(`📝 Template body formatted with ${templateParams.length} parameters`);
        } else {
          messageBody = `[Template: ${template_name}]`;
        }
      }

      // 🆕 Use canonicalPhone for wa_to (consistency with inbound)
      const messageData = {
        wa_message_id: result.messages?.[0]?.id || null,
        wa_from: null, // Outbound message, so from is null
        wa_to: canonicalPhone, // 🆕 Use canonical phone
        wa_phone_number_id: phoneNumberId,
        direction: 'outbound',
        body: messageBody,
        wa_timestamp: new Date().toISOString(),
        raw: result,
        created_at: new Date().toISOString(),
        is_template: !!template_name || !!interactive,
        conversation_id: finalConversationId,
      };

      // 🆕 FIRST: Update department_code BEFORE inserting message (to avoid race condition with realtime)
      if (finalConversationId) {
        if (template_name && template_name.toLowerCase().includes('atualizacao')) {
          console.log(`📢 Template "atualizacao" detected - forcing department_code = 'marketing' BEFORE message insert`);
          
          const { error: deptError } = await supabase
            .from('conversations')
            .update({ 
              department_code: 'marketing',
              last_message_at: new Date().toISOString()
            })
            .eq('id', finalConversationId);
          
          if (deptError) {
            console.error('Error setting marketing department:', deptError);
          } else {
            console.log(`✅ Conversation ${finalConversationId} set to marketing department`);
          }
        } else {
          // Regular timestamp update for non-atualizacao templates
          await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', finalConversationId);
        }
      }

      // SECOND: Insert message (triggers realtime event - department already set)
      const { error: dbError } = await supabase
        .from('messages')
        .insert([messageData]);

      if (dbError) {
        console.error('Error saving message to database:', dbError);
      } else {
        console.log('✅ Message saved to database', { 
          conversation_id: finalConversationId,
          wa_to: canonicalPhone
        });
      }
    } catch (dbError) {
      console.error('Database save error:', dbError);
    }

    // 🆕 Return success response with conversation info
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso',
        conversation_id: finalConversationId,
        conversation_phone: canonicalPhone // 🆕 Return canonical phone for frontend navigation
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
