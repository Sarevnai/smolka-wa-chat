import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    console.log('🧪 DEBUG INBOUND: Creating test message');
    
    const body = await req.json();
    const phoneNumber = body.phoneNumber || '554888182882';
    const text = body.text || 'Teste de mensagem inbound em tempo real';
    
    // Insert a fake inbound message
    const messageData = {
      wa_message_id: `debug_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      wa_from: phoneNumber,
      wa_to: '789298680936028', // Current phone number ID
      wa_phone_number_id: '789298680936028',
      direction: 'inbound' as const,
      body: text,
      wa_timestamp: new Date().toISOString(),
      raw: { debug: true, created_at: new Date().toISOString() },
      media_type: null,
      media_url: null,
      media_caption: null,
      media_filename: null,
      media_mime_type: null,
      is_template: false,
    };
    
    console.log('📝 Inserting debug message:', messageData);
    
    const { data, error } = await supabase
      .from('messages')
      .insert([messageData])
      .select();
    
    if (error) {
      console.error('❌ Error inserting debug message:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          details: error
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('✅ Debug message inserted successfully:', data[0]);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: data[0],
        info: 'Message should appear in real-time in the chat window'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('💥 Debug function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
