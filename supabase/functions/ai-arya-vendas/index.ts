import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Development {
  id: string;
  name: string;
  slug: string;
  developer: string;
  address: string | null;
  neighborhood: string | null;
  city: string;
  status: string;
  delivery_date: string | null;
  starting_price: number | null;
  description: string | null;
  differentials: string[];
  amenities: string[];
  unit_types: { tipo: string; area: number; preco_de: number }[];
  faq: { pergunta: string; resposta: string }[];
  ai_instructions: string | null;
  talking_points: string[];
  c2s_project_id: string | null;
}

interface DevelopmentMaterial {
  id: string;
  material_type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  whatsapp_media_id: string | null;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Format currency in BRL
function formatCurrency(value: number | null): string {
  if (!value) return 'Consultar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// Build quick transfer prompt for landing page leads
function buildQuickTransferPrompt(dev: Development, contactName?: string): string {
  const hasName = !!contactName && contactName.toLowerCase() !== 'lead sem nome';
  
  return `Você é Arya, consultora da Smolka Imóveis 🏠

═══════════════════════════════════════════════════════════════
📋 ${dev.name.toUpperCase()} - ${dev.developer.toUpperCase()}
═══════════════════════════════════════════════════════════════

📍 LOCAL: ${dev.neighborhood ? `${dev.neighborhood}, ` : ''}${dev.city}
💰 A PARTIR DE: ${formatCurrency(dev.starting_price)}

═══════════════════════════════════════════════════════════════
🎯 OBJETIVO: Qualificar brevemente e transferir para especialista
═══════════════════════════════════════════════════════════════

FLUXO OBRIGATÓRIO (siga esta ordem):

1️⃣ PRIMEIRO: Cumprimente e confirme interesse no ${dev.name}
   ${hasName 
     ? `✅ Já sabemos o nome: ${contactName}`
     : `❓ Pergunte: "Como posso te chamar?"`}

2️⃣ DEPOIS: Faça 1-2 perguntas rápidas de qualificação:
   - "O que te chamou atenção no ${dev.name}?"
   - "Você está buscando para morar ou investir?"
   - "Já conhece a região de ${dev.neighborhood || dev.city}?"
   (Escolha 1-2 perguntas, não precisa fazer todas)

3️⃣ POR ÚLTIMO: Transfira para especialista usando enviar_lead_c2s
   - Diga: "Vou te conectar com um de nossos especialistas no ${dev.name}!"
   - Use a tool com todas as informações coletadas

═══════════════════════════════════════════════════════════════
💬 EXEMPLOS DE FLUXO COMPLETO
═══════════════════════════════════════════════════════════════

MENSAGEM 1 (Lead chega, sem nome):
"Olá! Que bom seu interesse no ${dev.name}! 🏠
Como posso te chamar?"

MENSAGEM 2 (Após saber o nome):
"Prazer, [Nome]! 😊
O que te chamou atenção no ${dev.name}? Está buscando para morar ou investir?"

MENSAGEM 3 (Após qualificação):
"Perfeito, [Nome]! 
Vou te conectar agora com um de nossos especialistas no ${dev.name}. 
Ele vai te apresentar todas as condições e opções disponíveis! 🏡✨"
→ Neste momento, chame a função enviar_lead_c2s internamente

SE JÁ TIVER NOME NA PRIMEIRA MENSAGEM:
"Olá ${contactName}! Que bom seu interesse no ${dev.name}! 🏠
O que te chamou atenção? Está buscando para morar ou investir?"

═══════════════════════════════════════════════════════════════
⚠️ REGRAS IMPORTANTES
═══════════════════════════════════════════════════════════════

- NÃO responda perguntas técnicas detalhadas (preços, plantas, condições)
- Se perguntarem, diga: "O especialista vai te explicar tudo em detalhes!"
- NÃO envie materiais (plantas, perspectivas)
- SEMPRE mencione o nome do empreendimento "${dev.name}" nas respostas
- Seja simpática, breve e eficiente
- IMPORTANTE: Só use enviar_lead_c2s APÓS ter o nome E fazer pelo menos 1 pergunta de qualificação
- ⚠️ NUNCA inclua instruções internas como "[usar...]", "[chamar...]" ou "→" nas mensagens para o cliente!`;
}

// Build dynamic prompt based on development data (full mode)
function buildEmpreendimentoPrompt(dev: Development): string {
  const unitTypesFormatted = dev.unit_types
    .map(u => `• ${u.tipo}: ${u.area}m² - A partir de ${formatCurrency(u.preco_de)}`)
    .join('\n');

  const differentialsFormatted = dev.differentials
    .map(d => `• ${d}`)
    .join('\n');

  const amenitiesFormatted = dev.amenities
    .map(a => `• ${a}`)
    .join('\n');

  const faqFormatted = dev.faq
    .map(f => `P: ${f.pergunta}\nR: ${f.resposta}`)
    .join('\n\n');

  const talkingPointsFormatted = dev.talking_points
    .map(t => `• ${t}`)
    .join('\n');

  return `Você é Arya, consultora de vendas da Smolka Imóveis 🏠

OBJETIVO: Atender leads interessados no empreendimento ${dev.name} da ${dev.developer}.
Ser prestativa, responder dúvidas básicas e encaminhar rapidamente para um corretor especializado.

═══════════════════════════════════════════════════════════════
📋 ${dev.name.toUpperCase()} - ${dev.developer.toUpperCase()}
═══════════════════════════════════════════════════════════════

📍 LOCALIZAÇÃO:
${dev.address ? `• Endereço: ${dev.address}` : ''}
${dev.neighborhood ? `• Bairro: ${dev.neighborhood}` : ''}
• Cidade: ${dev.city}

💰 VALORES E ENTREGA:
• A partir de: ${formatCurrency(dev.starting_price)}
${dev.delivery_date ? `• Previsão de entrega: ${dev.delivery_date}` : ''}
• Status: ${dev.status === 'lancamento' ? 'Lançamento' : dev.status === 'em_construcao' ? 'Em construção' : 'Pronto para morar'}

🏠 TIPOLOGIAS DISPONÍVEIS:
${unitTypesFormatted || '• Consultar disponibilidade'}

✨ DIFERENCIAIS:
${differentialsFormatted || '• Acabamento de alto padrão'}

🎯 ÁREAS DE LAZER E INFRAESTRUTURA:
${amenitiesFormatted || '• Infraestrutura completa'}

${dev.description ? `📝 SOBRE O EMPREENDIMENTO:\n${dev.description}\n` : ''}

❓ PERGUNTAS FREQUENTES:
${faqFormatted || 'Consulte o corretor para mais detalhes.'}

${talkingPointsFormatted ? `\n💡 PONTOS DE DESTAQUE:\n${talkingPointsFormatted}` : ''}

═══════════════════════════════════════════════════════════════
⚠️ REGRAS DE ATENDIMENTO
═══════════════════════════════════════════════════════════════

1. 🎯 ATENDIMENTO RÁPIDO: Responda 1-3 perguntas do cliente, seja objetiva
2. 📤 TRANSFERÊNCIA: Após responder as dúvidas iniciais, use enviar_lead_c2s para transferir
3. 🖼️ MATERIAIS: Use enviar_material quando pedirem plantas, perspectivas ou fotos
4. 💬 TOM: Seja prestativa, profissional e acolhedora
5. ❌ NÃO NEGOCIE: Não discuta descontos, condições especiais ou valores finais - o corretor fará isso
6. 📱 FORMATO: Use mensagens curtas e diretas, adequadas para WhatsApp
7. 😊 EMOJIS: Use emojis com moderação para tornar a conversa mais acolhedora

${dev.ai_instructions ? `\n📋 INSTRUÇÕES ESPECÍFICAS:\n${dev.ai_instructions}` : ''}

═══════════════════════════════════════════════════════════════
🔧 FERRAMENTAS DISPONÍVEIS
═══════════════════════════════════════════════════════════════

1. enviar_lead_c2s: Transferir lead para corretor especializado
   - Use após responder 1-3 perguntas básicas
   - Inclua: nome do cliente, interesse, resumo do atendimento
   
2. enviar_material: Enviar planta baixa, perspectiva ou material do empreendimento
   - Use quando o cliente pedir para ver plantas, fotos ou materiais

IMPORTANTE: Sempre que perceber que o cliente está interessado e você já respondeu as dúvidas 
básicas, transfira para o corretor usando enviar_lead_c2s. O corretor está preparado para 
dar continuidade ao atendimento com propostas personalizadas.

Ao transferir, avise o cliente de forma natural:
"Vou te conectar com um de nossos corretores especialistas no ${dev.name} para dar 
continuidade ao seu atendimento! 🏠✨"`;
}

// Define tools for OpenAI - Full mode with materials
const toolsFull = [
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor especializado no C2S. Use após responder 1-3 perguntas básicas do cliente.",
      parameters: {
        type: "object",
        properties: {
          nome: { 
            type: "string", 
            description: "Nome do cliente" 
          },
          interesse: { 
            type: "string", 
            description: "Tipologia ou unidade de interesse (ex: '3 quartos', 'cobertura')" 
          },
          resumo: { 
            type: "string", 
            description: "Resumo breve do atendimento e perguntas respondidas" 
          },
          observacoes: { 
            type: "string", 
            description: "Observações relevantes para o corretor" 
          }
        },
        required: ["nome", "resumo"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "enviar_material",
      description: "Enviar material do empreendimento via WhatsApp (planta baixa, perspectiva, vídeo, book)",
      parameters: {
        type: "object",
        properties: {
          tipo: { 
            type: "string", 
            enum: ["planta_baixa", "perspectiva", "video", "book", "foto"],
            description: "Tipo de material a enviar"
          },
          tipologia: { 
            type: "string", 
            description: "Tipologia específica se aplicável (ex: '2 quartos', '3 quartos')" 
          }
        },
        required: ["tipo"]
      }
    }
  }
];

// Define tools for quick transfer mode - Only C2S transfer with qualification
const toolsQuickTransfer = [
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor especializado no C2S. Use APÓS coletar nome E fazer 1-2 perguntas de qualificação.",
      parameters: {
        type: "object",
        properties: {
          nome: { 
            type: "string", 
            description: "Nome do cliente" 
          },
          interesse: { 
            type: "string", 
            description: "Interesse: morar, investir, conhecer" 
          },
          motivacao: { 
            type: "string", 
            description: "O que chamou atenção do cliente no empreendimento" 
          },
          resumo: { 
            type: "string", 
            description: "Resumo breve da conversa e qualificação" 
          }
        },
        required: ["nome", "interesse", "resumo"]
      }
    }
  }
];

// Send WhatsApp message
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<boolean> {
  try {
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!waToken || !waPhoneId) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: { body: message }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

// Send WhatsApp media
async function sendWhatsAppMedia(phoneNumber: string, mediaUrl: string, caption?: string): Promise<boolean> {
  try {
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!waToken || !waPhoneId) {
      console.error('WhatsApp credentials not configured');
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${waToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'image',
          image: { 
            link: mediaUrl,
            caption: caption || ''
          }
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('WhatsApp media API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending WhatsApp media:', error);
    return false;
  }
}

// Call OpenAI API with tools
async function callOpenAI(
  systemPrompt: string, 
  conversationHistory: ConversationMessage[],
  userMessage: string,
  tools: any[]
): Promise<{ content: string; toolCalls: any[] }> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const choice = data.choices[0];
  
  return {
    content: choice.message.content || '',
    toolCalls: choice.message.tool_calls || []
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { 
      phone_number, 
      message, 
      development_id, 
      development_slug,
      conversation_history = [],
      contact_name 
    } = await req.json();

    console.log(`🏗️ Arya Vendas - Phone: ${phone_number}, Development: ${development_id || development_slug}`);

    // Check if quick transfer mode is enabled
    const { data: quickModeSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_category', 'ai_arya')
      .eq('setting_key', 'quick_transfer_mode')
      .maybeSingle();

    const isQuickTransferMode = quickModeSetting?.setting_value === true 
      || quickModeSetting?.setting_value === 'true';

    console.log(`⚡ Quick Transfer Mode: ${isQuickTransferMode ? 'ENABLED' : 'DISABLED'}`);

    // Fetch development data
    let development: Development | null = null;
    
    if (development_id) {
      const { data } = await supabase
        .from('developments')
        .select('*')
        .eq('id', development_id)
        .eq('is_active', true)
        .single();
      development = data;
    } else if (development_slug) {
      const { data } = await supabase
        .from('developments')
        .select('*')
        .eq('slug', development_slug)
        .eq('is_active', true)
        .single();
      development = data;
    }

    if (!development) {
      console.error('Development not found:', development_id || development_slug);
      return new Response(
        JSON.stringify({ error: 'Development not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Development loaded: ${development.name}`);

    // Fetch available materials for this development (only in full mode)
    let materials: DevelopmentMaterial[] = [];
    if (!isQuickTransferMode) {
      const { data } = await supabase
        .from('development_materials')
        .select('*')
        .eq('development_id', development.id)
        .order('order_index');
      materials = data || [];
    }

    // Build the prompt based on mode
    const systemPrompt = isQuickTransferMode
      ? buildQuickTransferPrompt(development, contact_name)
      : buildEmpreendimentoPrompt(development);

    // Select tools based on mode
    const tools = isQuickTransferMode ? toolsQuickTransfer : toolsFull;

    // Call OpenAI
    const aiResponse = await callOpenAI(systemPrompt, conversation_history, message, tools);
    console.log(`🤖 AI Response:`, aiResponse.content?.substring(0, 100));

    let finalResponse = aiResponse.content;
    let c2sTransferred = false;
    let materialSent = false;

    // Process tool calls
    for (const toolCall of aiResponse.toolCalls) {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log(`🔧 Tool call: ${functionName}`, args);

      if (functionName === 'enviar_lead_c2s') {
        // Send lead to C2S
        try {
          const c2sPayload = {
            name: args.nome || contact_name || 'Lead sem nome',
            phone: phone_number,
            email: null,
            property_type: args.interesse || null,
            neighborhood: null, // Para leads de empreendimento, o bairro já está implícito no nome
            budget_min: null,
            budget_max: development.starting_price,
            bedrooms: null,
            additional_info: isQuickTransferMode
              ? `🚀 LEAD DE LANDING PAGE - ${development.name}\n${development.developer}\n\nModo: Transferência Rápida\nInteresse: ${args.interesse || 'Não informado'}\nMotivação: ${args.motivacao || 'Não informada'}\nResumo: ${args.resumo}`
              : `Empreendimento: ${development.name}\n${development.developer}\n\nResumo do atendimento:\n${args.resumo}\n\nObservações: ${args.observacoes || 'Nenhuma'}`,
            conversation_summary: args.resumo,
            development_id: development.id,
            development_name: development.name,
            interesse: args.interesse,
            motivacao: args.motivacao
          };

          const { data: c2sResult, error: c2sError } = await supabase.functions.invoke('c2s-create-lead', {
            body: c2sPayload
          });

          if (c2sError) {
            console.error('C2S error:', c2sError);
          } else {
            console.log('✅ Lead sent to C2S:', c2sResult);
            c2sTransferred = true;
          }
        } catch (error) {
          console.error('Error sending to C2S:', error);
        }
      }

      // Only process material tool in full mode
      if (functionName === 'enviar_material' && !isQuickTransferMode) {
        // Find and send material
        const materialType = args.tipo;
        const tipologia = args.tipologia?.toLowerCase();
        
        let material: DevelopmentMaterial | undefined;
        
        if (tipologia) {
          // Try to find material matching tipologia
          material = materials?.find(m => 
            m.material_type === materialType && 
            m.title.toLowerCase().includes(tipologia)
          );
        }
        
        // Fallback to any material of that type
        if (!material) {
          material = materials?.find(m => m.material_type === materialType);
        }

        if (material) {
          const caption = `${development.name} - ${material.title}`;
          const sent = await sendWhatsAppMedia(phone_number, material.file_url, caption);
          if (sent) {
            materialSent = true;
            console.log(`📸 Material sent: ${material.title}`);
          }
        } else {
          console.log(`⚠️ Material not found: ${materialType}`);
        }
      }
    }

    // Send the AI response via WhatsApp
    if (finalResponse) {
      await sendWhatsAppMessage(phone_number, finalResponse);
    }

    // Log the interaction
    await supabase.from('activity_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      action_type: 'ai_arya_vendas',
      target_table: 'conversations',
      target_id: phone_number,
      metadata: {
        development_id: development.id,
        development_name: development.name,
        c2s_transferred: c2sTransferred,
        material_sent: materialSent,
        quick_transfer_mode: isQuickTransferMode,
        message_preview: message.substring(0, 100)
      }
    }).then(() => {}).catch(console.error);

    return new Response(
      JSON.stringify({
        success: true,
        response: finalResponse,
        c2s_transferred: c2sTransferred,
        material_sent: materialSent,
        quick_transfer_mode: isQuickTransferMode,
        development: {
          id: development.id,
          name: development.name,
          slug: development.slug
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ai-arya-vendas:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
