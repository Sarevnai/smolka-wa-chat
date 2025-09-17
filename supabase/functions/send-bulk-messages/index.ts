import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactInfo {
  phone: string;
  name?: string;
}

interface BulkMessageRequest {
  contacts: ContactInfo[];
  message: string;
  template_id?: string;
  campaign_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header and verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Autorização necessária' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated and get user info
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha na autenticação' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      console.error('❌ User not authorized for bulk messaging:', profileError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Privilégios de administrador necessários para envio em massa' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ User authenticated as admin:', user.email);

    const { contacts, message, template_id, campaign_id }: BulkMessageRequest = await req.json();

    console.log('Bulk message request:', { contactCount: contacts.length, messageLength: message.length });

    // Validate input
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Lista de contatos é obrigatória e deve conter pelo menos um contato' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Mensagem é obrigatória' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Function to clean and validate Brazilian phone numbers
    function cleanPhoneNumber(phone: string): string {
      // Remove all non-numeric characters
      return phone.replace(/\D/g, '');
    }

    function validateBrazilianPhone(phone: string): boolean {
      const cleaned = cleanPhoneNumber(phone);
      
      // Brazilian phone patterns:
      // - 13 digits: +55 XX 9 XXXX-XXXX (with country code and mobile 9)
      // - 12 digits: +55 XX XXXX-XXXX (with country code, no mobile 9)
      // - 11 digits: XX 9 XXXX-XXXX (no country code, with mobile 9)
      // - 10 digits: XX XXXX-XXXX (no country code, no mobile 9)
      
      if (cleaned.length === 13 && cleaned.startsWith('55')) {
        // +55 format with mobile 9
        return true;
      } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
        // +55 format without mobile 9
        return true;
      } else if (cleaned.length === 11) {
        // Brazilian format with mobile 9 (no country code)
        return true;
      } else if (cleaned.length === 10) {
        // Brazilian format without mobile 9 (no country code)
        return true;
      }
      
      return false;
    }

    function normalizePhoneNumber(phone: string): string {
      const cleaned = cleanPhoneNumber(phone);
      
      // Normalize to WhatsApp format (with country code, no + sign)
      if (cleaned.length === 13 && cleaned.startsWith('55')) {
        // Already has country code
        return cleaned;
      } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
        // Has country code but missing mobile 9, add it
        const areaCode = cleaned.slice(2, 4);
        const number = cleaned.slice(4);
        return `55${areaCode}9${number}`;
      } else if (cleaned.length === 11) {
        // No country code, add 55
        return `55${cleaned}`;
      } else if (cleaned.length === 10) {
        // No country code and no mobile 9, add both
        const areaCode = cleaned.slice(0, 2);
        const number = cleaned.slice(2);
        return `55${areaCode}9${number}`;
      }
      
      return cleaned; // Return as-is if doesn't match patterns
    }

    // Validate phone numbers and rate limiting
    const invalidContacts = contacts.filter(contact => {
      if (!contact.phone || typeof contact.phone !== 'string') {
        return true;
      }
      
      const isValid = validateBrazilianPhone(contact.phone);
      if (!isValid) {
        console.log(`❌ Invalid phone format: ${contact.phone} (cleaned: ${cleanPhoneNumber(contact.phone)})`);
      }
      return !isValid;
    });

    if (invalidContacts.length > 0) {
      console.error('❌ Invalid phone numbers found:', invalidContacts);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Números de telefone inválidos encontrados',
          invalid_contacts: invalidContacts
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Rate limiting - max 100 contacts per request
    if (contacts.length > 100) {
      console.error('❌ Too many contacts in single request:', contacts.length);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Máximo de 100 contatos permitidos por solicitação de envio em massa' 
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

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let successful = 0;
    let failed = 0;
    const errors: Array<{ phone: string; error: string }> = [];
    const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    // Process each contact with delay to respect rate limits
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        const normalizedPhone = normalizePhoneNumber(contact.phone);
        console.log(`Sending message ${i + 1}/${contacts.length} to ${contact.phone} (normalized: ${normalizedPhone})`);

        // Prepare WhatsApp API payload with normalized phone
        const whatsappPayload = {
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message }
        };

        // Send message via WhatsApp API
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
          console.error(`WhatsApp API error for ${contact.phone}:`, result);
          failed++;
          errors.push({
            phone: contact.phone,
            error: result.error?.message || 'Erro na API do WhatsApp'
          });
          continue;
        }

        // Save successful message to database
        try {
          const messageData = {
            wa_message_id: result.messages?.[0]?.id || null,
            wa_from: null, // Outbound message
            wa_to: normalizedPhone, // Use normalized phone for consistency with API
            wa_phone_number_id: phoneNumberId,
            direction: 'outbound',
            body: message,
            wa_timestamp: new Date().toISOString(),
            raw: result,
            created_at: new Date().toISOString(),
            is_template: !!template_id
          };

          const { error: dbError } = await supabase
            .from('messages')
            .insert([messageData]);

          if (dbError) {
            console.error(`Database error for ${contact.phone}:`, dbError);
          }

          // Save campaign result if campaign_id is provided
          if (campaign_id) {
            const campaignResultData = {
              campaign_id,
              contact_id: null, // We'd need to find this by phone
              phone: contact.phone,
              status: 'sent' as const,
              sent_at: new Date().toISOString(),
            };

            const { error: campaignError } = await supabase
              .from('campaign_results')
              .insert([campaignResultData]);

            if (campaignError) {
              console.error(`Campaign result error for ${contact.phone}:`, campaignError);
            }
          }
        } catch (dbError) {
          console.error(`Database save error for ${contact.phone}:`, dbError);
        }

        successful++;
        console.log(`Message sent successfully to ${contact.phone}`);

      } catch (error: any) {
        console.error(`Error sending to ${contact.phone}:`, error);
        failed++;
        errors.push({
          phone: contact.phone,
          error: error.message || 'Erro desconhecido'
        });

        // Save failed campaign result if campaign_id is provided
        if (campaign_id) {
          try {
            const campaignResultData = {
              campaign_id,
              contact_id: null,
              phone: contact.phone,
              status: 'failed' as const,
              error_message: error.message || 'Erro desconhecido',
            };

            await supabase
              .from('campaign_results')
              .insert([campaignResultData]);
          } catch (dbError) {
            console.error(`Campaign result error for failed ${contact.phone}:`, dbError);
          }
        }
      }

      // Add delay between messages to respect rate limits (2 seconds)
      if (i < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`Bulk message completed: ${successful} successful, ${failed} failed`);

    // Return final results
    return new Response(
      JSON.stringify({ 
        success: true,
        successful,
        failed,
        total: contacts.length,
        errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in send-bulk-messages function:', error);
    
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