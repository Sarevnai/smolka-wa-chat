import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-make-api-key',
};

// ========== TYPES ==========
interface MakeWebhookRequest {
  phone: string;
  message: string;
  contact_name?: string;
  message_id?: string;
  timestamp?: string;
  message_type?: string;
}

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
  hero_image: string | null;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

type DepartmentType = 'locacao' | 'administrativo' | 'vendas' | 'marketing' | null;

// ========== UTILITY FUNCTIONS ==========

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function getPhoneVariations(phoneNumber: string): string[] {
  const variations = [phoneNumber];
  
  if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
    const withNine = phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4);
    variations.push(withNine);
  }
  
  if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
    const withoutNine = phoneNumber.slice(0, 4) + phoneNumber.slice(5);
    variations.push(withoutNine);
  }
  
  return variations;
}

function formatCurrency(value: number | null): string {
  if (!value) return 'Consultar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// ========== PROMPT BUILDERS ==========

function buildQuickTransferPrompt(dev: Development, contactName?: string, isFirstMessage?: boolean): string {
  const hasName = !!contactName && contactName.toLowerCase() !== 'lead sem nome';
  
  return `Você é a Helena, assistente de atendimento da Smolka Imóveis, especializada em apresentar o empreendimento ${dev.name} pelo WhatsApp ao Lead vindo da Landing Page oficial.

═══════════════════════════════════════════════════════════════
🎯 OBJETIVO
═══════════════════════════════════════════════════════════════

- Dar boas-vindas e apresentar rapidamente o ${dev.name}
- Qualificar o lead de forma leve
- Descobrir: nome, se é para morar ou investir, e o que é mais importante (localização, lazer, bem-estar, tamanho, etc.)
- Encaminhar para especialista humano com resumo das informações

═══════════════════════════════════════════════════════════════
📋 REGRAS GERAIS
═══════════════════════════════════════════════════════════════

- Tom cordial, objetivo e consultivo, sem parecer panfleto
- SEMPRE uma pergunta por mensagem, mantendo ritmo de chat
- Mensagens curtas, evitando blocos grandes
- Use emojis com moderação

═══════════════════════════════════════════════════════════════
💬 FLUXO DE MENSAGENS
═══════════════════════════════════════════════════════════════

${isFirstMessage ? `
🆕 ESTA É A PRIMEIRA MENSAGEM DO LEAD
- NÃO inclua saudação na sua resposta (já foi enviada pelo sistema com a imagem)
- ${hasName ? `Já sabemos o nome: ${contactName}. Responda: "Prazer em te conhecer, ${contactName}! 😊 Você está buscando algo para morar ou para investir?"` : `Responda APENAS: "Pra começar bem, como posso te chamar?"`}
` : ''}

📝 APÓS RECEBER O NOME:
- Responda: "Prazer em te conhecer, [nome]! 😊"
- Emende: "Você está buscando algo para morar ou para investir?"

═══════════════════════════════════════════════════════════════
🏠 SE FOR PARA MORAR
═══════════════════════════════════════════════════════════════

Reconheça o objetivo e traga benefícios:
"Perfeito, [nome]! O ${dev.name} foi pensado para quem quer morar bem em Florianópolis, em um endereço exclusivo no João Paulo, entre o centro e as praias do norte da Ilha, com lazer completo, piscina climatizada, academia e área de bem-estar."

Pergunte: "Desses pontos, o que pesa mais pra você hoje: localização, área de lazer ou conforto do apartamento em si?"

═══════════════════════════════════════════════════════════════
📈 SE FOR PARA INVESTIR
═══════════════════════════════════════════════════════════════

Reconheça o objetivo e traga benefícios:
"Excelente, [nome]! O ${dev.name} é uma ótima opção para investir em Florianópolis, porque está no João Paulo, um bairro estratégico entre o centro e o norte da Ilha, com padrão construtivo de alto nível e lazer completo, o que atrai bons inquilinos e tende a valorizar no longo prazo."

Pergunte: "Você pensa mais em renda com aluguel ou em valorização do imóvel ao longo dos anos?"

═══════════════════════════════════════════════════════════════
🔄 ENCAMINHAMENTO PARA ESPECIALISTA
═══════════════════════════════════════════════════════════════

Após descobrir: nome + objetivo (morar/investir) + prioridade principal

Finalize: "Perfeito, [nome]! Vou te conectar com um dos nossos especialistas da Smolka que conhece todos os detalhes do ${dev.name} e vai te mostrar as melhores opções conforme o que você me contou."

Use a função enviar_lead_c2s com:
- nome
- objetivo (morar/investir)  
- prioridade principal
- breve resumo do contexto

═══════════════════════════════════════════════════════════════
⚠️ REGRA-CHAVE
═══════════════════════════════════════════════════════════════

NUNCA responder com discurso genérico. SEMPRE usar "morar" ou "investir" para customizar o benefício e a pergunta seguinte.

Estrutura fixa: reconhecer objetivo → conectar com diferenciais reais → fazer pergunta de aprofundamento.

- NÃO responda perguntas técnicas detalhadas
- Se perguntarem detalhes, diga: "O especialista vai te explicar tudo em detalhes!"
- NÃO envie materiais
- Seja simpática, breve e eficiente
- IMPORTANTE: Só use enviar_lead_c2s APÓS ter o nome E objetivo (morar/investir) E prioridade
- ⚠️ NUNCA inclua instruções internas nas mensagens!`;
}

function buildVirtualAgentPrompt(): string {
  return `Você é a Nina, assistente virtual da Smolka Imóveis 🏠

OBJETIVO: Ajudar clientes de forma cordial e eficiente via WhatsApp.

REGRAS:
- Seja simpática e profissional
- Mensagens curtas e diretas
- Use emojis com moderação
- Responda em português brasileiro

CAPACIDADES:
- Tirar dúvidas sobre a empresa
- Explicar serviços disponíveis (locação, vendas, administração)
- Encaminhar para o departamento correto
- Fornecer informações básicas

Se não souber responder algo específico, diga que vai verificar com um especialista.`;
}

// ========== OPENAI INTEGRATION ==========

const toolsQuickTransfer = [
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor especializado no C2S. Use APÓS coletar nome E fazer 1-2 perguntas de qualificação.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente" },
          interesse: { type: "string", description: "Interesse: morar, investir, conhecer" },
          motivacao: { type: "string", description: "O que chamou atenção do cliente no empreendimento" },
          resumo: { type: "string", description: "Resumo breve da conversa e qualificação" }
        },
        required: ["nome", "interesse", "resumo"]
      }
    }
  }
];

async function callOpenAI(
  systemPrompt: string, 
  conversationHistory: ConversationMessage[],
  userMessage: string,
  tools?: any[]
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

  const requestBody: any = {
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.7,
    max_tokens: 500,
  };

  if (tools && tools.length > 0) {
    requestBody.tools = tools;
    requestBody.tool_choice = 'auto';
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
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

// ========== DATABASE FUNCTIONS ==========

async function findOrCreateConversation(
  supabase: any, 
  phoneNumber: string, 
  departmentCode: DepartmentType = null
): Promise<{ id: string; department_code: DepartmentType; contact_id: string | null } | null> {
  try {
    // Try to find existing active conversation
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, department_code, contact_id')
      .eq('phone_number', phoneNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConv) {
      console.log(`✅ Found existing conversation: ${existingConv.id}`);
      return existingConv;
    }

    // Get or create contact
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, department_code')
      .eq('phone', phoneNumber)
      .maybeSingle();

    // Create new conversation
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        phone_number: phoneNumber,
        contact_id: contact?.id || null,
        department_code: departmentCode || contact?.department_code || 'vendas',
        status: 'active',
        last_message_at: new Date().toISOString()
      })
      .select('id, department_code, contact_id')
      .single();

    if (error) {
      console.error('❌ Error creating conversation:', error);
      return null;
    }

    console.log(`✅ New conversation created: ${newConv.id}`);
    return newConv;

  } catch (error) {
    console.error('❌ Error in findOrCreateConversation:', error);
    return null;
  }
}

async function saveMessage(
  supabase: any,
  conversationId: string | null,
  phoneNumber: string,
  body: string,
  direction: 'inbound' | 'outbound',
  messageId?: string
): Promise<number | null> {
  try {
    const messageData: any = {
      conversation_id: conversationId,
      wa_message_id: messageId || `make_${direction}_${Date.now()}`,
      wa_from: direction === 'inbound' ? phoneNumber : null,
      wa_to: direction === 'outbound' ? phoneNumber : null,
      direction,
      body,
      wa_timestamp: new Date().toISOString(),
      department_code: 'vendas'
    };

    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Error saving ${direction} message:`, error);
      return null;
    }

    console.log(`💾 ${direction} message saved: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`❌ Error in saveMessage:`, error);
    return null;
  }
}

async function getConversationHistory(
  supabase: any,
  conversationId: string,
  limit: number = 10
): Promise<ConversationMessage[]> {
  try {
    const { data: messages } = await supabase
      .from('messages')
      .select('direction, body')
      .eq('conversation_id', conversationId)
      .not('body', 'is', null)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!messages?.length) return [];

    return messages.map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body
    }));
  } catch (error) {
    console.error('❌ Error getting conversation history:', error);
    return [];
  }
}

async function checkDevelopmentLead(
  supabase: any,
  phoneNumber: string
): Promise<{ development_id: string; development_name: string; contact_name: string | null } | null> {
  try {
    const phoneVariations = getPhoneVariations(phoneNumber);
    const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: portalLead } = await supabase
      .from('portal_leads_log')
      .select(`
        id,
        development_id,
        contact_name,
        developments!inner(name, slug)
      `)
      .in('contact_phone', phoneVariations)
      .not('development_id', 'is', null)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!portalLead?.development_id) return null;

    console.log(`🏗️ Development lead found: ${(portalLead.developments as any)?.name}`);
    return {
      development_id: portalLead.development_id,
      development_name: (portalLead.developments as any)?.name || 'Unknown',
      contact_name: portalLead.contact_name
    };
  } catch (error) {
    console.error('❌ Error checking development lead:', error);
    return null;
  }
}

async function detectDevelopmentFromMessage(
  supabase: any,
  messageBody: string
): Promise<{ development_id: string; development_name: string } | null> {
  try {
    if (!messageBody || messageBody.length < 5) return null;

    const { data: developments } = await supabase
      .from('developments')
      .select('id, name, slug')
      .eq('is_active', true);

    if (!developments?.length) return null;

    const normalizedMessage = messageBody.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const dev of developments) {
      const normalizedName = dev.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (normalizedName.length >= 5 && normalizedMessage.includes(normalizedName)) {
        console.log(`🏗️ Development detected in message: "${dev.name}"`);
        return { development_id: dev.id, development_name: dev.name };
      }
      
      if (dev.slug) {
        const normalizedSlug = dev.slug.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (normalizedSlug.length >= 5 && normalizedMessage.includes(normalizedSlug)) {
          console.log(`🏗️ Development detected by slug: "${dev.name}"`);
          return { development_id: dev.id, development_name: dev.name };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error detecting development from message:', error);
    return null;
  }
}

async function getDevelopment(supabase: any, developmentId: string): Promise<Development | null> {
  const { data } = await supabase
    .from('developments')
    .select('*')
    .eq('id', developmentId)
    .eq('is_active', true)
    .single();
  return data;
}

async function createOrUpdateContact(
  supabase: any,
  phoneNumber: string,
  contactName?: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('phone', phoneNumber)
      .maybeSingle();

    if (existing) {
      // Update name if provided and not already set
      if (contactName && !existing.name) {
        await supabase
          .from('contacts')
          .update({ name: contactName, department_code: 'vendas' })
          .eq('id', existing.id);
      }
    } else {
      // Create new contact
      await supabase
        .from('contacts')
        .insert({
          phone: phoneNumber,
          name: contactName || null,
          status: 'ativo',
          department_code: 'vendas'
        });
    }
  } catch (error) {
    console.error('❌ Error creating/updating contact:', error);
  }
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Validate API key
    const apiKey = req.headers.get('x-make-api-key');
    const expectedApiKey = Deno.env.get('MAKE_API_KEY');

    if (!apiKey || apiKey !== expectedApiKey) {
      console.error('❌ Invalid or missing API key');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: MakeWebhookRequest = await req.json();
    const { phone, message, contact_name, message_id, timestamp, message_type } = body;

    console.log(`📥 Make webhook received - Phone: ${phone}, Message: "${message?.substring(0, 50)}..."`);

    // Validate required fields
    if (!phone || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: phone and message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    const phoneNumber = normalizePhoneNumber(phone);
    console.log(`📱 Normalized phone: ${phoneNumber}`);

    // Create or update contact
    await createOrUpdateContact(supabase, phoneNumber, contact_name);

    // Find or create conversation
    const conversation = await findOrCreateConversation(supabase, phoneNumber, 'vendas');
    const conversationId = conversation?.id || null;

    // Save inbound message
    await saveMessage(supabase, conversationId, phoneNumber, message, 'inbound', message_id);

    // Get conversation history
    const history = conversationId 
      ? await getConversationHistory(supabase, conversationId)
      : [];

    // Detect which AI agent to use
    let aiResponse = '';
    let agent = 'nina';
    let developmentDetected: string | null = null;
    let c2sTransferred = false;

    // 1. Check if this is a development lead (from portal/landing page)
    const developmentLead = await checkDevelopmentLead(supabase, phoneNumber);
    
    // 2. Or detect development mentioned in message
    const mentionedDevelopment = await detectDevelopmentFromMessage(supabase, message);

    if (developmentLead || mentionedDevelopment) {
      // Use Helena Smolka (ai-arya-vendas logic)
      agent = 'helena';
      const devInfo = developmentLead || mentionedDevelopment!;
      developmentDetected = devInfo.development_name;
      
      console.log(`🏗️ Routing to Helena for development: ${devInfo.development_name}`);

      const development = await getDevelopment(supabase, devInfo.development_id);
      
      if (development) {
        const isFirstMessage = history.length === 0;
        const resolvedContactName = developmentLead?.contact_name || contact_name;
        
        // Build prompt and call OpenAI
        const systemPrompt = buildQuickTransferPrompt(development, resolvedContactName, isFirstMessage);
        const result = await callOpenAI(systemPrompt, history, message, toolsQuickTransfer);
        
        aiResponse = result.content;

        // Process tool calls (C2S transfer)
        for (const toolCall of result.toolCalls) {
          if (toolCall.function.name === 'enviar_lead_c2s') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`🔧 C2S transfer requested:`, args);
            
            try {
              await supabase.functions.invoke('c2s-create-lead', {
                body: {
                  name: args.nome || resolvedContactName || 'Lead sem nome',
                  phone: phoneNumber,
                  property_type: args.interesse,
                  additional_info: `🚀 LEAD VIA MAKE - ${development.name}\nInteresse: ${args.interesse}\nMotivação: ${args.motivacao || 'N/A'}\nResumo: ${args.resumo}`,
                  conversation_summary: args.resumo,
                  development_id: development.id,
                  development_name: development.name,
                  interesse: args.interesse,
                  motivacao: args.motivacao
                }
              });
              c2sTransferred = true;
              console.log('✅ Lead transferred to C2S');
            } catch (error) {
              console.error('❌ Error transferring to C2S:', error);
            }
          }
        }

        // Handle first message greeting for developments
        if (isFirstMessage) {
          const hasName = !!resolvedContactName && resolvedContactName.toLowerCase() !== 'lead sem nome';
          const greetingMessage = `Que bom seu interesse no ${development.name}, no bairro João Paulo, em Florianópolis! 🏠 Entre o azul do mar e o verde das montanhas, é um lugar pensado para viver com calma e bem-estar.`;
          const followUpMessage = hasName 
            ? `Prazer em te conhecer, ${resolvedContactName}! 😊 Você está buscando algo para morar ou para investir?`
            : 'Pra começar bem, como posso te chamar?';
          
          aiResponse = `${greetingMessage}\n\n${followUpMessage}`;
        }
      } else {
        // Development not found, fallback to Nina
        console.log('⚠️ Development not found, using Nina');
        const systemPrompt = buildVirtualAgentPrompt();
        const result = await callOpenAI(systemPrompt, history, message);
        aiResponse = result.content;
        agent = 'nina';
      }
    } else {
      // Default: Use Nina (virtual agent)
      console.log('🤖 Routing to Nina (virtual agent)');
      const systemPrompt = buildVirtualAgentPrompt();
      const result = await callOpenAI(systemPrompt, history, message);
      aiResponse = result.content;
    }

    // Save outbound message (AI response)
    if (aiResponse && conversationId) {
      await saveMessage(supabase, conversationId, phoneNumber, aiResponse, 'outbound');
    }

    // Update conversation timestamp
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // Log the interaction
    await supabase.from('activity_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action_type: 'make_webhook_processed',
      target_table: 'messages',
      target_id: phoneNumber,
      metadata: {
        agent,
        development_detected: developmentDetected,
        c2s_transferred: c2sTransferred,
        conversation_id: conversationId,
        message_preview: message.substring(0, 100)
      }
    }).catch(console.error);

    console.log(`✅ Make webhook processed - Agent: ${agent}, Response length: ${aiResponse.length}`);

    // Return response for Make to send via WhatsApp
    return new Response(
      JSON.stringify({
        success: true,
        result: aiResponse,
        phone: phoneNumber,
        agent,
        conversation_id: conversationId,
        metadata: {
          development_detected: developmentDetected,
          c2s_transferred: c2sTransferred,
          contact_name: contact_name
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in make-webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        result: 'Desculpe, tive um problema técnico. Pode tentar novamente em instantes?'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
