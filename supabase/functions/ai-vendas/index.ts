import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
  hero_image: string | null; // New: presentation image for first contact
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

// Audio TTS configuration
interface AudioConfig {
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_max_chars: number;
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

// Build quick transfer prompt for landing page leads - Helena Smolka
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

LAZER DISPONÍVEL: piscina adulto/infantil climatizada, salão de festas, espaço gourmet, brinquedoteca, playground, coworking, academia, spa, sauna, espaço zen, fire place, horta, espaço pet, fitness externo.

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

  return `Você é a Helena, consultora de vendas da Smolka Imóveis 🏠

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

// Send WhatsApp message - Returns message ID for tracking
async function sendWhatsAppMessage(phoneNumber: string, message: string): Promise<{ success: boolean; messageId?: string }> {
  try {
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!waToken || !waPhoneId) {
      console.error('WhatsApp credentials not configured');
      return { success: false };
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
      return { success: false };
    }

    const data = await response.json();
    const messageId = data.messages?.[0]?.id;
    
    return { success: true, messageId };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false };
  }
}

// Send WhatsApp media with image - Returns message ID for tracking
async function sendWhatsAppMedia(phoneNumber: string, mediaUrl: string, caption?: string): Promise<{ success: boolean; messageId?: string }> {
  try {
    const waToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const waPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!waToken || !waPhoneId) {
      console.error('WhatsApp credentials not configured');
      return { success: false };
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
      return { success: false };
    }

    const data = await response.json();
    const messageId = data.messages?.[0]?.id;
    
    return { success: true, messageId };
  } catch (error) {
    console.error('Error sending WhatsApp media:', error);
    return { success: false };
  }
}

// Helper: Small delay between messages for natural flow
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize Supabase client for internal use (TTS, etc.)
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseInternal = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get audio TTS configuration from system_settings
 */
async function getAudioConfig(): Promise<AudioConfig | null> {
  try {
    const { data } = await supabaseInternal
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .maybeSingle();
    
    if (!data?.setting_value) return null;
    
    const config = data.setting_value as any;
    return {
      audio_enabled: config.audio_enabled || false,
      audio_voice_id: config.audio_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      audio_mode: config.audio_mode || 'text_and_audio',
      audio_max_chars: config.audio_max_chars || 1000
    };
  } catch (error) {
    console.error('❌ Error getting audio config:', error);
    return null;
  }
}

/**
 * Generate and send audio via ElevenLabs TTS
 */
async function generateAndSendAudio(
  phoneNumber: string,
  text: string,
  audioConfig: AudioConfig
): Promise<boolean> {
  try {
    // Limit text for TTS
    const textToConvert = text.length > audioConfig.audio_max_chars 
      ? text.substring(0, audioConfig.audio_max_chars) + '...'
      : text;
    
    console.log('🎙️ Helena: Generating TTS audio...', { textLength: textToConvert.length });
    
    // Generate audio via elevenlabs-tts
    const { data: ttsResult, error: ttsError } = await supabaseInternal.functions.invoke('elevenlabs-tts', {
      body: {
        text: textToConvert,
        voiceId: audioConfig.audio_voice_id
      }
    });
    
    if (ttsError || !ttsResult?.success) {
      console.error('❌ TTS generation failed:', ttsError || ttsResult?.error);
      return false;
    }
    
    console.log('✅ Audio generated:', ttsResult.audioUrl);
    
    // Send audio via send-wa-media
    const { error: sendError } = await supabaseInternal.functions.invoke('send-wa-media', {
      body: {
        to: phoneNumber,
        mediaUrl: ttsResult.audioUrl,
        mediaType: 'audio',
        mimeType: ttsResult.contentType || 'audio/mpeg'
      }
    });
    
    if (sendError) {
      console.error('❌ Error sending audio to WhatsApp:', sendError);
      return false;
    }
    
    console.log('✅ Helena audio sent to WhatsApp');
    return true;
    
  } catch (error) {
    console.error('❌ Error in generateAndSendAudio:', error);
    return false;
  }
}

// Helper: Save message to database and send via WhatsApp (with TTS if enabled)
async function saveAndSendMessage(
  supabase: any,
  conversationId: string | null,
  phoneNumber: string,
  body: string,
  mediaUrl?: string,
  mediaType?: string
): Promise<{ success: boolean; savedMessageId?: number; waMessageId?: string }> {
  let savedMessageId: number | null = null;
  
  // Save to database first
  if (conversationId) {
    const messageData: any = {
      conversation_id: conversationId,
      wa_from: null,
      wa_to: phoneNumber,
      direction: 'outbound',
      body: body,
      department_code: 'vendas'
    };
    
    if (mediaUrl) {
      messageData.media_url = mediaUrl;
      messageData.media_type = mediaType || 'image/jpeg';
    }
    
    const { data: savedMessage, error: saveError } = await supabase
      .from('messages')
      .insert(messageData)
      .select('id')
      .single();
    
    if (saveError) {
      console.error('❌ Error saving message to database:', saveError);
    } else {
      savedMessageId = savedMessage?.id;
      console.log('💾 Message saved to database:', savedMessageId);
    }
  }
  
  // Get audio configuration
  const audioConfig = await getAudioConfig();
  
  // Determine what to send based on audio_mode
  const sendText = !audioConfig?.audio_enabled || 
                   audioConfig.audio_mode === 'text_only' || 
                   audioConfig.audio_mode === 'text_and_audio';
  
  const sendAudio = audioConfig?.audio_enabled && 
                    !mediaUrl && // Don't send audio if already sending media
                    (audioConfig.audio_mode === 'audio_only' || 
                     audioConfig.audio_mode === 'text_and_audio');
  
  console.log(`🔊 Helena response mode:`, { sendText, sendAudio, mode: audioConfig?.audio_mode || 'text_only' });
  
  // Send via WhatsApp
  let waResult: { success: boolean; messageId?: string } = { success: false };
  
  if (sendText || mediaUrl) {
    if (mediaUrl) {
      waResult = await sendWhatsAppMedia(phoneNumber, mediaUrl, body);
    } else {
      waResult = await sendWhatsAppMessage(phoneNumber, body);
    }
  }
  
  // Update message with wa_message_id
  if (waResult.success && waResult.messageId && savedMessageId) {
    await supabase
      .from('messages')
      .update({ wa_message_id: waResult.messageId })
      .eq('id', savedMessageId);
    console.log('✅ Message updated with WhatsApp ID:', waResult.messageId);
  }
  
  // Send audio (if enabled and not a media message)
  if (sendAudio && audioConfig) {
    const audioSent = await generateAndSendAudio(phoneNumber, body, audioConfig);
    
    if (!audioSent && audioConfig.audio_mode === 'audio_only') {
      // Fallback: if audio_only mode failed and we didn't send text, send text now
      console.log('⚠️ Audio failed in audio_only mode, falling back to text');
      waResult = await sendWhatsAppMessage(phoneNumber, body);
    }
  }
  
  return { 
    success: waResult.success || sendAudio, 
    savedMessageId: savedMessageId || undefined,
    waMessageId: waResult.messageId 
  };
}

// Call OpenAI API with tools
async function callOpenAI(
  systemPrompt: string, 
  conversationHistory: ConversationMessage[],
  userMessage: string,
  tools: any[]
): Promise<{ content: string; toolCalls: any[] }> {
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!lovableApiKey) {
    throw new Error('Lovable AI API key not configured');
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5',
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

    console.log(`🏗️ Aimee Vendas - Phone: ${phone_number}, Development: ${development_id || development_slug}`);

    // ═══════════════════════════════════════════════════════════════
    // 🚫 OUT OF SCOPE DETECTION - Redirect locação/administrativo
    // ═══════════════════════════════════════════════════════════════
    // This channel (API Direta Meta) handles ONLY empreendimentos/vendas
    // Locação and Administrativo requests should go to 48 9 9163-1011
    
    const OUT_OF_SCOPE_PATTERNS = {
      locacao: [
        /\b(alugar|aluguel|loca[çc][aã]o|locar|alugo|quero\s+alugar)\b/i,
        /\b(apartamento|casa|kit(net)?)\s+(pra|para|de)?\s*alug/i,
        /\bim[oó]vel\s+(pra|para)?\s*locar\b/i,
        /\b(procurando|procuro|busco|quero)\s+.{0,20}(alugar|aluguel|loca[çc][aã]o)\b/i,
        /\b(pra|para)\s+alugar\b/i,
      ],
      administrativo: [
        /\b(boleto|2[ªa]\s*via|segunda\s*via)\b/i,
        /\b(pagar|pagamento)\s+.{0,15}(boleto|aluguel|conta)\b/i,
        /\b(contrato|rescis[aã]o|renova[çc][aã]o|distrato)\b/i,
        /\b(manuten[çc][aã]o|conserto|reparo|vazamento|problema)\s+.{0,15}(im[oó]vel|apartamento|casa)?\b/i,
        /\b(j[aá]\s*sou\s*cliente|inquilino|propriet[aá]rio|locat[aá]rio)\b/i,
        /\b(falar\s+com|preciso\s+do|atendimento|sac|suporte)\s+.{0,10}(atendente|humano|pessoa)?\b/i,
        /\b(meu\s+im[oó]vel|minha\s+casa|meu\s+apartamento)\b/i,
        /\b(problema|defeito|quebrou|n[aã]o\s+funciona)\b/i,
      ]
    };

    function detectOutOfScope(msg: string): 'locacao' | 'administrativo' | null {
      const lower = msg.toLowerCase();
      
      for (const pattern of OUT_OF_SCOPE_PATTERNS.locacao) {
        if (pattern.test(lower)) return 'locacao';
      }
      
      for (const pattern of OUT_OF_SCOPE_PATTERNS.administrativo) {
        if (pattern.test(lower)) return 'administrativo';
      }
      
      return null;
    }

    const REDIRECT_MESSAGES = {
      locacao: `Entendi que você busca um imóvel para alugar! 🏠

Para locação, nossa equipe especializada pode te ajudar melhor pelo número:
📱 *48 9 9163-1011*

Lá você vai ter atendimento completo para encontrar o imóvel ideal! 😊`,

      administrativo: `Entendi! Para questões administrativas como boletos, contratos ou manutenção, nosso time de suporte pode te ajudar:
📱 *48 9 9163-1011*

Eles vão resolver sua solicitação rapidinho! 😊`
    };

    // Check for out-of-scope requests BEFORE any processing
    const outOfScope = detectOutOfScope(message);
    if (outOfScope) {
      console.log(`⚠️ Out of scope detected: ${outOfScope} - Redirecting to 48 9 9163-1011`);
      
      const redirectMessage = REDIRECT_MESSAGES[outOfScope];
      
      // Send redirect message via WhatsApp
      await sendWhatsAppMessage(phone_number, redirectMessage);
      
      // Log the redirect for metrics
      await supabase.from('activity_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'ai_vendas_redirect',
        target_table: 'conversations',
        target_id: phone_number,
        metadata: {
          detected_scope: outOfScope,
          message_preview: message.substring(0, 100),
          redirected_to: '48 9 9163-1011',
          channel: 'api_direta_meta',
          development_requested: development_id || development_slug || null
        }
      }).catch(console.error);
      
      return new Response(
        JSON.stringify({
          success: true,
          action: 'redirected_out_of_scope',
          scope_detected: outOfScope,
          redirected_to: '48 9 9163-1011',
          message_sent: redirectMessage
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ═══════════════════════════════════════════════════════════════

    // Check if quick transfer mode is enabled
    const { data: quickModeSetting } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_category', 'ai_vendas')
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

    // Fetch conversation for this phone number to link messages
    let conversationId: string | null = null;
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone_number', phone_number)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conv) {
      conversationId = conv.id;
      console.log(`📞 Found conversation: ${conversationId}`);
    } else {
      console.log(`⚠️ No conversation found for phone: ${phone_number}`);
    }

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

    // Detect if this is the first message from the lead (empty conversation history)
    const isFirstMessage = !conversation_history || conversation_history.length === 0;
    
    // 🔍 DETAILED DEBUG LOGGING
    console.log(`📊 ========== FIRST MESSAGE DETECTION ==========`);
    console.log(`📊 conversation_history type: ${typeof conversation_history}`);
    console.log(`📊 conversation_history length: ${conversation_history?.length || 0}`);
    console.log(`📊 conversation_history is null/undefined: ${!conversation_history}`);
    console.log(`📊 conversation_history is empty array: ${Array.isArray(conversation_history) && conversation_history.length === 0}`);
    console.log(`📩 Is first message: ${isFirstMessage}`);
    
    console.log(`👋 ========== WELCOME CHECK ==========`);
    console.log(`👋 isQuickTransferMode: ${isQuickTransferMode}`);
    console.log(`👋 Will send welcome: ${isFirstMessage && isQuickTransferMode}`);
    console.log(`📊 ==========================================`);

    // Handle first message with text-only greeting (no hero image)
    if (isFirstMessage && isQuickTransferMode) {
      console.log(`👋 Sending welcome greeting for ${development.name}`);
      
      // 1. Send greeting text message - Helena Smolka
      const greetingMessage = `Que bom seu interesse no ${development.name}, no bairro João Paulo, em Florianópolis! 🏠 Entre o azul do mar e o verde das montanhas, é um lugar pensado para viver com calma e bem-estar.`;
      await saveAndSendMessage(
        supabase,
        conversationId,
        phone_number,
        greetingMessage
      );
      
      // Small delay for natural flow
      await delay(1500);
      
      // 2. Check if we already have the name
      const hasName = !!contact_name && contact_name.toLowerCase() !== 'lead sem nome';
      
      let followUpMessage: string;
      if (hasName) {
        followUpMessage = `Prazer em te conhecer, ${contact_name}! 😊 Você está buscando algo para morar ou para investir?`;
      } else {
        followUpMessage = 'Pra começar bem, como posso te chamar?';
      }
      
      // 3. Send follow-up question in separate message
      await saveAndSendMessage(
        supabase,
        conversationId,
        phone_number,
        followUpMessage
      );
      
      // Log the interaction
      await supabase.from('activity_logs').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        action_type: 'ai_vendas_welcome',
        target_table: 'conversations',
        target_id: phone_number,
        metadata: {
          development_id: development.id,
          development_name: development.name,
          hero_image_sent: false,
          greeting_type: 'text_only',
          has_contact_name: hasName,
          quick_transfer_mode: isQuickTransferMode,
          message_preview: message.substring(0, 100)
        }
      }).then(() => {}).catch(console.error);
      
      return new Response(
        JSON.stringify({
          success: true,
          response: `${greetingMessage}\n\n${followUpMessage}`,
          hero_image_sent: false,
          greeting_type: 'text_only',
          quick_transfer_mode: isQuickTransferMode,
          development: {
            id: development.id,
            name: development.name,
            slug: development.slug
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the prompt based on mode (flag if first message for context)
    const systemPrompt = isQuickTransferMode
      ? buildQuickTransferPrompt(development, contact_name, isFirstMessage)
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
          const result = await sendWhatsAppMedia(phone_number, material.file_url, caption);
          if (result.success) {
            materialSent = true;
            console.log(`📸 Material sent: ${material.title}`);
          }
        } else {
          console.log(`⚠️ Material not found: ${materialType}`);
        }
      }
    }

    // Send the AI response via WhatsApp and save to database
    if (finalResponse) {
      await saveAndSendMessage(
        supabase,
        conversationId,
        phone_number,
        finalResponse
      );
    }

    // Log the interaction
    await supabase.from('activity_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000', // System user
      action_type: 'ai_vendas',
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
    console.error('❌ Error in ai-vendas:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
