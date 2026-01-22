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
  // For simulating user responses
  simulateResponse?: {
    userMessage: string;
    conversationHistory: Array<{ role: string; content: string; imageUrl?: string }>;
    excludeProperties?: string[]; // Properties already shown to avoid repetition
  };
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
    const { leadName, leadPhone, portal, listingId, transactionType = 'SELL', message, simulateResponse } = body;
    const excludeProperties = simulateResponse?.excludeProperties || [];

    console.log('🧪 Simulation request:', { leadName, leadPhone, portal, listingId, hasSimulateResponse: !!simulateResponse, excludeProperties: excludeProperties.length });

    // ========== MODE 2: Simulate user response (call real AI) ==========
    if (simulateResponse) {
      console.log('💬 Processing user response:', simulateResponse.userMessage);
      
      // Build context from conversation history
      const conversationContext = simulateResponse.conversationHistory || [];
      const userMessage = simulateResponse.userMessage;
      
      // Call the real AI virtual agent in simulation mode
      // We'll simulate by calling the AI directly without sending WhatsApp messages
      
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured");
      }
      
      // Load AI config
      const { data: configData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_agent_config')
        .single();
      
      const config = configData?.setting_value || {};
      const agentName = config.agent_name || 'Helena';
      const companyName = config.company_name || 'Smolka Imóveis';
      
      // Get property info for context
      const { data: propertyData } = await supabase.functions.invoke('vista-get-property', {
        body: { codigo: listingId }
      });
      
      const property = propertyData?.property;
      const propertyContext = property ? `
O cliente veio do portal ${portal} interessado no imóvel:
- Código: ${property.codigo}
- Tipo: ${property.categoria}
- Bairro: ${property.bairro}
- Preço: R$ ${(transactionType === 'SELL' ? property.valor_venda : property.valor_locacao)?.toLocaleString('pt-BR')}
` : '';
      
      // Build messages for AI
      const aiMessages = [
        {
          role: 'system',
          content: `Você é ${agentName}, assistente virtual da ${companyName}. 
${propertyContext}

REGRAS CRÍTICAS:
- Responda de forma curta e humanizada (máximo 2-3 frases)
- Use emojis moderadamente
- Estilo consultivo: "Faz sentido pra você?"

PROIBIÇÕES ABSOLUTAS:
- NUNCA invente ou descreva imóveis por conta própria
- NUNCA cite códigos de imóveis, preços, metragens ou bairros que não vieram do sistema
- NUNCA descreva características de imóveis em texto livre
- Se o cliente pedir "outra opção", responda APENAS: "Vou buscar outra opção pra você! 🔍"
- Detalhes de imóveis alternativos serão enviados AUTOMATICAMENTE pelo sistema

O QUE VOCÊ PODE FAZER:
- Responder perguntas gerais sobre o imóvel original (que está no contexto acima)
- Gerenciar agendamentos de visita (perguntar dia/horário)
- Coletar dados do cliente (nome, telefone)
- Fazer perguntas de qualificação

Se o cliente demonstrar INTERESSE (quero visitar, tenho interesse, quero conhecer), pergunte qual dia/horário seria melhor.`
        },
        ...conversationContext.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ];
      
      // Call Lovable AI
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: aiMessages,
          max_tokens: 200
        }),
      });
      
      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI error:', errorText);
        throw new Error(`AI error: ${aiResponse.status}`);
      }
      
      const aiResult = await aiResponse.json();
      let aiContent = aiResult.choices?.[0]?.message?.content || 'Desculpe, não entendi. Pode repetir?';
      
      // Check if AI suggests looking for alternatives
      const wantsAlternative = /outra|outro|diferente|não gostei|não curti/i.test(userMessage);
      const wantsScheduling = /agendar|visitar|conhecer|interesse|quero ver|quero ir/i.test(userMessage);

      // SAFETY CHECK: Detect if AI is trying to invent property details
      const containsInventedProperty = /R\$\s*[\d.,]+.*(?:apartamento|casa|terreno|imóvel|m²)/i.test(aiContent) ||
        /(?:código|cod)\s*[:\.]?\s*\d{4,}/i.test(aiContent) ||
        /\d{2,4}\s*m²/i.test(aiContent);
      
      // If AI is inventing properties when asking for alternatives, use safe response
      if (wantsAlternative && containsInventedProperty) {
        console.log('⚠️ AI tried to invent property, using safe response');
        aiContent = 'Vou buscar outra opção pra você! 🔍';
      }

      const simulatedMessages: SimulatedMessage[] = [{
        type: 'text',
        content: aiContent,
        timestamp: new Date().toISOString()
      }];
      
      // Track shown properties for this response
      const shownProperties: string[] = [];
      
      // If user wants alternative and we have property context, search for similar
      if (wantsAlternative && property) {
        const isRental = transactionType === 'RENT';
        const originalPrice = isRental ? property.valor_locacao : property.valor_venda;
        
        // Map property type to search parameter
        const propertyType = property.categoria?.toLowerCase()?.includes('apartamento') ? 'apartamento' :
          property.categoria?.toLowerCase()?.includes('casa') ? 'casa' :
          property.categoria?.toLowerCase()?.includes('terreno') ? 'terreno' : undefined;
        
        console.log('🔍 Searching alternatives with params:', {
          tipo: propertyType,
          bairro: property.bairro,
          finalidade: isRental ? 'locacao' : 'venda',
          preco_min: originalPrice ? Math.floor(originalPrice * 0.7) : undefined,
          preco_max: originalPrice ? Math.ceil(originalPrice * 1.3) : undefined,
          excludeProperties: [...excludeProperties, property.codigo]
        });
        
        // Search for similar properties with CORRECT parameters
        const { data: searchResult } = await supabase.functions.invoke('vista-search-properties', {
          body: {
            tipo: propertyType,
            bairro: property.bairro,
            finalidade: isRental ? 'locacao' : 'venda',
            preco_min: originalPrice ? Math.floor(originalPrice * 0.7) : undefined,
            preco_max: originalPrice ? Math.ceil(originalPrice * 1.3) : undefined,
            limit: 10
          }
        });
        
        console.log('🔍 Search result:', { 
          success: searchResult?.success, 
          count: searchResult?.properties?.length 
        });
        
        if (searchResult?.success && searchResult?.properties?.length > 0) {
          // Filter out already shown properties AND original property
          const allExcluded = [...excludeProperties, property.codigo];
          const alternatives = searchResult.properties.filter((p: any) => 
            !allExcluded.includes(p.codigo) && !allExcluded.includes(String(p.codigo))
          );
          
          console.log('📦 Alternatives after filtering:', alternatives.length);
          
          if (alternatives.length > 0) {
            const altProperty = alternatives[0];
            
            // Track this property as shown
            shownProperties.push(altProperty.codigo);
            
            // Use normalized fields from vista-search-properties
            const altBairro = altProperty.bairro || 'Localização';
            const altFoto = altProperty.foto_destaque;
            
            simulatedMessages.push({
              type: 'text',
              content: `Olha essa outra opção que separei pra você! 🏠`,
              timestamp: new Date(Date.now() + 1000).toISOString()
            });
            
            if (altFoto) {
              simulatedMessages.push({
                type: 'image',
                content: `📍 ${altBairro}`,
                imageUrl: altFoto,
                timestamp: new Date(Date.now() + 2000).toISOString()
              });
            }
            
            // Use special formatter for search results (already normalized)
            simulatedMessages.push({
              type: 'text',
              content: formatPropertyDetailsFromSearch(altProperty, transactionType),
              timestamp: new Date(Date.now() + 3000).toISOString()
            });
            
            simulatedMessages.push({
              type: 'text',
              content: 'Faz mais sentido pra você? 😊',
              timestamp: new Date(Date.now() + 4000).toISOString()
            });
          } else {
            // No more alternatives available
            simulatedMessages.push({
              type: 'text',
              content: 'No momento não encontrei outras opções similares nessa faixa. Posso buscar em outros bairros ou faixas de preço? 🏠',
              timestamp: new Date(Date.now() + 1000).toISOString()
            });
          }
        } else {
          // Search failed or no results
          simulatedMessages.push({
            type: 'text',
            content: 'Vou verificar outras opções disponíveis. Me conta: tem preferência por algum bairro ou faixa de preço? 😊',
            timestamp: new Date(Date.now() + 1000).toISOString()
          });
        }
      }
      
      // Add scheduling detection context
      const detectedIntent = wantsScheduling ? 'scheduling' : wantsAlternative ? 'alternative' : 'general';
      
      return new Response(
        JSON.stringify({
          success: true,
          mode: 'response_simulation',
          messages: simulatedMessages,
          detectedIntent,
          shownProperties, // Return shown properties for tracking
          debug: {
            userMessage,
            wantsAlternative,
            wantsScheduling,
            excludedCount: excludeProperties.length,
            newShownCount: shownProperties.length
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== MODE 1: Initial simulation (first contact) ==========
    
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

    // Step 3: Generate simulated messages (what Nina would send)
    
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
  // Normalize fields - Vista CRM can return snake_case or PascalCase
  const categoria = property.categoria || property.Categoria || 'Imóvel';
  const bairro = property.bairro || property.Bairro || 'Localização não informada';
  const dormitorios = property.dormitorios || property.Dormitorios;
  const suites = property.suites || property.Suites;
  const areaUtil = property.area_util || property.AreaPrivativa || property.AreaUtil;
  const vagas = property.vagas || property.Vagas;
  const valorVenda = property.valor_venda || property.ValorVenda;
  const valorLocacao = property.valor_locacao || property.ValorLocacao;
  const codigo = property.codigo || property.Codigo;
  
  const valor = transactionType === 'SELL' ? valorVenda : valorLocacao;
  const tipoTransacao = transactionType === 'SELL' ? 'Venda' : 'Locação';
  
  const priceFormatted = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    maximumFractionDigits: 0 
  }).format(valor || 0);

  const lines = [
    `📍 ${bairro}`,
    '',
    `• ${categoria}`,
    dormitorios ? `• ${dormitorios} dormitório(s)${suites ? ` (${suites} suíte)` : ''}` : null,
    areaUtil ? `• ${areaUtil}m²` : null,
    vagas ? `• ${vagas} vaga(s)` : null,
    `• ${tipoTransacao}: ${priceFormatted}`,
    '',
    `🔗 smolkaimoveis.com.br/imovel/${codigo}`
  ].filter(Boolean);

  return lines.join('\n');
}

// Special formatter for properties from vista-search-properties (already normalized)
function formatPropertyDetailsFromSearch(property: any, transactionType: string): string {
  const tipo = property.tipo || 'Imóvel';
  const bairro = property.bairro || 'Localização não informada';
  const quartos = property.quartos;
  const suites = property.suites;
  const areaUtil = property.area_util;
  const vagas = property.vagas;
  const preco = property.preco_formatado;
  const codigo = property.codigo;
  const link = property.link || `smolkaimoveis.com.br/imovel/${codigo}`;
  
  const tipoTransacao = transactionType === 'SELL' ? 'Venda' : 'Locação';
  
  // Use formatted price from search or format the raw price
  let precoDisplay = preco;
  if (!precoDisplay && property.preco) {
    precoDisplay = new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL',
      maximumFractionDigits: 0 
    }).format(property.preco);
  }

  const lines = [
    `📍 ${bairro}`,
    '',
    `• ${tipo}`,
    quartos ? `• ${quartos} dormitório(s)${suites ? ` (${suites} suíte)` : ''}` : null,
    areaUtil ? `• ${areaUtil}m²` : null,
    vagas ? `• ${vagas} vaga(s)` : null,
    precoDisplay ? `• ${tipoTransacao}: ${precoDisplay}` : null,
    '',
    `🔗 ${link}`
  ].filter(Boolean);

  return lines.join('\n');
}
