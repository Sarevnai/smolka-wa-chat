import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    const validApiKey = Deno.env.get('MAKE_API_KEY');
    
    if (!apiKey || apiKey !== validApiKey) {
      console.error('❌ Invalid API key');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    console.log('📥 Make handler received:', JSON.stringify(body, null, 2));

    const {
      phone_number,
      message,
      contact_name,
      mode,              // 'vendas', 'empreendimento', 'locacao', 'marketing'
      development_slug,  // for empreendimento mode
      development_id,    // alternative to slug
      conversation_history,
      metadata
    } = body;

    // Validate required fields
    if (!phone_number || !message) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: phone_number, message' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Determine which agent to route to based on mode
    let agentFunction: string;
    let agentPayload: any = {
      phone_number,
      message,
      contact_name,
      conversation_history: conversation_history || [],
      metadata
    };

    switch (mode) {
      case 'empreendimento':
        agentFunction = 'ai-arya-vendas';
        // Resolve development_id from slug if needed
        if (development_slug && !development_id) {
          const { data: dev } = await supabase
            .from('developments')
            .select('id')
            .eq('slug', development_slug)
            .eq('is_active', true)
            .single();
          
          if (dev) {
            agentPayload.development_id = dev.id;
          } else {
            console.warn(`⚠️ Development not found for slug: ${development_slug}`);
          }
        } else if (development_id) {
          agentPayload.development_id = development_id;
        }
        break;

      case 'vendas':
        // Check if there's a development lead for this phone
        const { data: devLead } = await supabase
          .from('portal_leads_log')
          .select('development_id')
          .eq('contact_phone', phone_number)
          .not('development_id', 'is', null)
          .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (devLead?.development_id) {
          agentFunction = 'ai-arya-vendas';
          agentPayload.development_id = devLead.development_id;
        } else {
          // Standard vendas without specific development
          agentFunction = 'ai-virtual-agent';
          agentPayload.department = 'vendas';
        }
        break;

      case 'locacao':
        agentFunction = 'ai-virtual-agent';
        agentPayload.department = 'locacao';
        break;

      case 'marketing':
        agentFunction = 'ai-marketing-agent';
        break;

      default:
        // Default to virtual agent
        agentFunction = 'ai-virtual-agent';
        agentPayload.department = mode || null;
    }

    console.log(`🤖 Routing to ${agentFunction} with payload:`, JSON.stringify(agentPayload, null, 2));

    // Call the appropriate agent
    const { data: agentResult, error: agentError } = await supabase.functions.invoke(agentFunction, {
      body: agentPayload
    });

    if (agentError) {
      console.error(`❌ Agent error (${agentFunction}):`, agentError);
      return new Response(JSON.stringify({ 
        success: false,
        error: `Agent error: ${agentError.message}`,
        agent: agentFunction
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Agent response (${agentFunction}):`, JSON.stringify(agentResult, null, 2));

    // Return standardized response for Make
    return new Response(JSON.stringify({
      success: true,
      agent: agentFunction,
      response: agentResult?.response || agentResult?.message || agentResult,
      actions: agentResult?.actions || [],
      metadata: {
        phone_number,
        mode,
        development_id: agentPayload.development_id,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Make handler error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
