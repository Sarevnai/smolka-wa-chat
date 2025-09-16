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
        console.log(`Sending message ${i + 1}/${contacts.length} to ${contact.phone}`);

        // Prepare WhatsApp API payload
        const whatsappPayload = {
          messaging_product: 'whatsapp',
          to: contact.phone,
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
            wa_to: contact.phone,
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