import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === 'GET') {
      // Webhook verification for WhatsApp
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      console.log('Webhook verification request:', { mode, token, challenge });

      // In production, verify the token matches your configured verify token
      if (mode === 'subscribe' && challenge) {
        console.log('Webhook verified successfully');
        return new Response(challenge, { headers: corsHeaders });
      }

      return new Response('Verification failed', { 
        status: 403, 
        headers: corsHeaders 
      });
    }

    if (req.method === 'POST') {
      // Handle incoming webhook events
      const body = await req.json();
      console.log('Received webhook:', JSON.stringify(body, null, 2));

      // Process WhatsApp webhook data
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'messages' && change.value.messages) {
                // Process incoming messages
                for (const message of change.value.messages) {
                  await processIncomingMessage(message, change.value);
                }
              }
            }
          }
        }
      }

      return new Response('OK', { headers: corsHeaders });
    }

    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in whatsapp-webhook function:', error);
    return new Response('Internal server error', { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});

async function processIncomingMessage(message: any, value: any) {
  try {
    console.log('Processing message:', message);

    // Extract message data
    const messageData = {
      wa_message_id: message.id,
      wa_from: message.from,
      wa_to: value.metadata?.phone_number_id || null,
      wa_phone_number_id: value.metadata?.phone_number_id || null,
      direction: 'inbound' as const,
      body: message.text?.body || message.type || 'No content',
      wa_timestamp: message.timestamp ? new Date(parseInt(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
      raw: message,
    };

    // Insert into database
    const { error } = await supabase
      .from('messages')
      .insert([messageData]);

    if (error) {
      console.error('Error inserting message:', error);
    } else {
      console.log('Message inserted successfully:', messageData.wa_message_id);
    }

  } catch (error) {
    console.error('Error processing message:', error);
  }
}