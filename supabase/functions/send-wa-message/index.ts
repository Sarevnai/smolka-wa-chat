import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { to, text } = await req.json();

    console.log('Send message request:', { to, text });

    // Validate input
    if (!to || !text) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos "to" e "text" são obrigatórios' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For now, we'll simulate a successful send
    // In a real implementation, you would:
    // 1. Get WhatsApp API credentials from secrets
    // 2. Make the actual API call to WhatsApp
    // 3. Handle the response and errors properly
    
    console.log('Message would be sent to:', to);
    console.log('Message content:', text);

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso (simulado)' 
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