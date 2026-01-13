import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SimulationRequest {
  leadName: string;
  leadPhone: string;
  portal: string;
  listingId: string;
  transactionType?: 'SELL' | 'RENT';
  message?: string;
}

interface SimulatedMessage {
  type: 'text' | 'image' | 'audio';
  content: string;
  imageUrl?: string;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SimulationRequest = await req.json();
    const { leadName, leadPhone, portal, listingId, transactionType = 'SELL', message } = body;

    console.log('🧪 Starting simulation for:', { leadName, leadPhone, portal, listingId });

    // Validate required fields
    if (!leadName || !leadPhone || !portal || !listingId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: leadName, leadPhone, portal, listingId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique simulation ID
    const simulationId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const simulatedMessages: SimulatedMessage[] = [];

    // Step 1: Fetch property from Vista CRM
    console.log('📥 Fetching property from Vista CRM...');
    
    const { data: propertyData, error: propertyError } = await supabase.functions.invoke('vista-get-property', {
      body: { codigo: listingId }
    });

    if (propertyError || !propertyData?.success) {
      console.log('❌ Property not found:', propertyError || propertyData?.error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Imóvel ${listingId} não encontrado no Vista CRM`,
          simulationId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const property = propertyData.property;
    console.log('✅ Property found:', property.bairro, property.categoria);

    // Step 2: Load AI Agent config
    const { data: configData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .single();

    const config = configData?.setting_value || {};
    const agentName = config.agent_name || 'Helena';
    const companyName = config.company_name || 'Smolka Imóveis';

    // Step 3: Generate simulated messages (what Helena would send)
    
    // Message 1: Greeting
    const greeting = `Olá, ${leadName}! 👋\n\nSou a ${agentName} da ${companyName}!\n\nVi que você se interessou por esse imóvel no ${portal}:`;
    simulatedMessages.push({
      type: 'text',
      content: greeting,
      timestamp: new Date().toISOString()
    });

    // Message 2: Property photo
    if (property.foto_destaque) {
      simulatedMessages.push({
        type: 'image',
        content: `Foto do imóvel - ${property.bairro}`,
        imageUrl: property.foto_destaque,
        timestamp: new Date(Date.now() + 1000).toISOString()
      });
    }

    // Message 3: Property details in bullet format
    const propertyDetails = formatPropertyDetails(property, transactionType);
    simulatedMessages.push({
      type: 'text',
      content: propertyDetails,
      timestamp: new Date(Date.now() + 2000).toISOString()
    });

    // Message 4: Consultive question
    const consultiveQuestion = 'Faz sentido pra você? 😊';
    simulatedMessages.push({
      type: 'text',
      content: consultiveQuestion,
      timestamp: new Date(Date.now() + 3000).toISOString()
    });

    // Step 4: Create simulation record for tracking
    const simulationRecord = {
      simulation_id: simulationId,
      lead_name: leadName,
      lead_phone: leadPhone,
      portal: portal,
      listing_id: listingId,
      property_data: property,
      messages_generated: simulatedMessages,
      created_at: new Date().toISOString()
    };

    console.log('✅ Simulation completed:', simulationId);
    console.log(`📤 Generated ${simulatedMessages.length} messages`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        simulationId,
        property: {
          codigo: property.codigo,
          bairro: property.bairro,
          categoria: property.categoria,
          valor: transactionType === 'SELL' ? property.valor_venda : property.valor_locacao,
          foto: property.foto_destaque
        },
        messages: simulatedMessages,
        expectedFlow: [
          { step: 1, description: 'Saudação contextualizada (portal + imóvel)' },
          { step: 2, description: 'Foto do imóvel' },
          { step: 3, description: 'Detalhes em bullets' },
          { step: 4, description: 'Pergunta consultiva' }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Simulation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function formatPropertyDetails(property: any, transactionType: string): string {
  const valor = transactionType === 'SELL' ? property.valor_venda : property.valor_locacao;
  const tipoTransacao = transactionType === 'SELL' ? 'Venda' : 'Locação';
  
  const priceFormatted = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    maximumFractionDigits: 0 
  }).format(valor || 0);

  const lines = [
    `📍 ${property.bairro || 'Localização não informada'}`,
    '',
    `• ${property.categoria || 'Imóvel'}`,
    property.dormitorios ? `• ${property.dormitorios} dormitório(s)${property.suites ? ` (${property.suites} suíte)` : ''}` : null,
    property.area_util ? `• ${property.area_util}m²` : null,
    property.vagas ? `• ${property.vagas} vaga(s)` : null,
    `• ${tipoTransacao}: ${priceFormatted}`,
    '',
    `🔗 smolkaimoveis.com.br/imovel/${property.codigo}`
  ].filter(Boolean);

  return lines.join('\n');
}
