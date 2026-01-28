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
  message_type?: string;  // "text" | "audio" | "voice" | "image" | "video" | "document" | "button"
  // Media fields
  media_url?: string;     // Public URL of the media file
  media_id?: string;      // WhatsApp media ID
  media_mime?: string;    // MIME type (audio/ogg, image/jpeg, etc)
  media_caption?: string; // Media caption
  media_filename?: string;// Filename (for documents)
  // Button fields (from template quick replies)
  button_text?: string;   // Text displayed on the button clicked
  button_payload?: string;// Payload configured for the button
}

interface MediaInfo {
  type?: string;
  url?: string;
  caption?: string;
  filename?: string;
  mimeType?: string;
}

interface AudioConfig {
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_max_chars: number;
}

interface AudioResult {
  audioUrl: string;
  isVoiceMessage: boolean;
  contentType: string;
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

function buildQuickTransferPrompt(dev: Development, contactName?: string, isFirstMessage?: boolean, history?: ConversationMessage[]): string {
  const hasName = !!contactName && contactName.toLowerCase() !== 'lead sem nome';
  const hasHistory = history && history.length > 0;
  
  return `Você é a Helena, assistente de atendimento da Smolka Imóveis, especializada em apresentar o empreendimento ${dev.name} pelo WhatsApp ao Lead vindo da Landing Page oficial.

${hasHistory ? `
═══════════════════════════════════════════════════════════════
📜 CONTEXTO IMPORTANTE - LEIA ANTES DE RESPONDER
═══════════════════════════════════════════════════════════════

Esta conversa já tem histórico. REGRAS OBRIGATÓRIAS:
- NUNCA repita perguntas que já foram respondidas no histórico
- Se o cliente já disse o nome, USE esse nome e NÃO pergunte novamente
- Se o cliente já disse se quer morar ou investir, NÃO pergunte novamente
- Leia o histórico abaixo e continue de onde a conversa parou

${hasName ? `🔹 NOME DO CLIENTE JÁ CONHECIDO: ${contactName} - USE ESTE NOME!` : ''}
` : ''}

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
  return `Você é a Helena, assistente virtual da Smolka Imóveis 🏠

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

// ========== TRIAGE FLOW ==========

type TriageStage = 'greeting' | 'awaiting_name' | 'awaiting_triage' | 'completed' | null;

interface ConversationState {
  triage_stage: TriageStage;
  customer_name?: string;
}

async function getConversationState(supabase: any, phoneNumber: string): Promise<ConversationState | null> {
  try {
    const { data } = await supabase
      .from('conversation_states')
      .select('triage_stage')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    return data;
  } catch (error) {
    console.error('❌ Error getting conversation state:', error);
    return null;
  }
}

async function updateTriageStage(supabase: any, phoneNumber: string, stage: TriageStage): Promise<void> {
  try {
    await supabase
      .from('conversation_states')
      .upsert({
        phone_number: phoneNumber,
        triage_stage: stage,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });
    
    console.log(`📊 Triage stage updated to: ${stage}`);
  } catch (error) {
    console.error('❌ Error updating triage stage:', error);
  }
}

async function getContactName(supabase: any, phoneNumber: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('contacts')
      .select('name')
      .eq('phone', phoneNumber)
      .maybeSingle();
    
    return data?.name || null;
  } catch (error) {
    return null;
  }
}

async function saveContactNameMake(supabase: any, phoneNumber: string, name: string): Promise<void> {
  try {
    await supabase
      .from('contacts')
      .update({ name, updated_at: new Date().toISOString() })
      .eq('phone', phoneNumber);
    
    console.log(`✅ Contact name saved: ${name}`);
  } catch (error) {
    console.error('❌ Error saving contact name:', error);
  }
}

function extractNameFromMessage(message: string): string | null {
  const cleaned = message.trim();
  
  // Skip if it's a common greeting without a name
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hello|hi)$/i.test(cleaned)) {
    return null;
  }
  
  // Extract name patterns: "sou o/a [name]", "meu nome é [name]", "pode me chamar de [name]"
  const patterns = [
    /(?:sou\s+(?:o|a)\s+)([A-Za-zÀ-ÿ]+)/i,
    /(?:meu\s+nome\s+[eé]\s+)([A-Za-zÀ-ÿ]+)/i,
    /(?:pode\s+me\s+chamar\s+de\s+)([A-Za-zÀ-ÿ]+)/i,
    /(?:me\s+chamo\s+)([A-Za-zÀ-ÿ]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }
  
  // If it's a short message (1-2 words), assume it's a name
  const words = cleaned.split(/\s+/);
  if (words.length <= 2 && words[0].length >= 2 && words[0].length <= 20) {
    // Check if first word is alphabetic
    if (/^[A-Za-zÀ-ÿ]+$/.test(words[0])) {
      return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    }
  }
  
  return null;
}

// Mapeamento de botões do template triagem para departamentos
const TRIAGE_BUTTON_MAP: Record<string, 'locacao' | 'vendas' | 'administrativo'> = {
  // Button text options (what user sees)
  'alugar': 'locacao',
  'comprar': 'vendas',
  'já sou cliente': 'administrativo',
  'ja sou cliente': 'administrativo',
  // Possible payloads
  'setor de locação': 'locacao',
  'setor de locacao': 'locacao',
  'setor de vendas': 'vendas',
  'setor administrativo': 'administrativo',
  'locacao': 'locacao',
  'vendas': 'vendas',
  'administrativo': 'administrativo',
  // Numeric alternatives
  '1': 'locacao',
  '2': 'vendas',
  '3': 'administrativo'
};

function inferDepartmentFromButton(buttonText?: string, buttonPayload?: string): 'locacao' | 'vendas' | 'administrativo' | null {
  // Try button text first
  if (buttonText) {
    const normalized = buttonText.toLowerCase().trim();
    if (TRIAGE_BUTTON_MAP[normalized]) {
      console.log(`🔘 Department detected from button_text: "${buttonText}" → ${TRIAGE_BUTTON_MAP[normalized]}`);
      return TRIAGE_BUTTON_MAP[normalized];
    }
  }
  
  // Try payload
  if (buttonPayload) {
    const normalized = buttonPayload.toLowerCase().trim();
    if (TRIAGE_BUTTON_MAP[normalized]) {
      console.log(`🔘 Department detected from button_payload: "${buttonPayload}" → ${TRIAGE_BUTTON_MAP[normalized]}`);
      return TRIAGE_BUTTON_MAP[normalized];
    }
  }
  
  return null;
}

function inferDepartmentFromText(text: string): 'locacao' | 'vendas' | 'administrativo' | null {
  const lower = text.toLowerCase().trim();
  
  // First check if it matches any button map entries (including numbers)
  if (TRIAGE_BUTTON_MAP[lower]) {
    return TRIAGE_BUTTON_MAP[lower];
  }
  
  // Locação patterns
  if (/alug|locar|loca[çc][aã]o|alugo/.test(lower)) return 'locacao';
  
  // Vendas patterns
  if (/compr|adquir|compra|vender|venda/.test(lower)) return 'vendas';
  
  // Administrativo patterns
  if (/cliente|inquilino|propriet[aá]rio|boleto|contrato|manuten[çc][aã]o|segunda via|pagamento/.test(lower)) return 'administrativo';
  
  return null;
}

async function assignDepartmentMake(
  supabase: any, 
  phoneNumber: string, 
  conversationId: string, 
  department: 'locacao' | 'vendas' | 'administrativo'
): Promise<void> {
  try {
    // Update conversation
    await supabase
      .from('conversations')
      .update({ department_code: department })
      .eq('id', conversationId);
    
    // Update contact
    await supabase
      .from('contacts')
      .update({ department_code: department })
      .eq('phone', phoneNumber);
    
    // Update triage stage to completed
    await updateTriageStage(supabase, phoneNumber, 'completed');
    
    console.log(`✅ Department assigned: ${department}`);
  } catch (error) {
    console.error('❌ Error assigning department:', error);
  }
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
  messageId?: string,
  mediaInfo?: MediaInfo
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
      department_code: 'vendas',
      // Media fields
      media_type: mediaInfo?.type || null,
      media_url: mediaInfo?.url || null,
      media_caption: mediaInfo?.caption || null,
      media_filename: mediaInfo?.filename || null,
      media_mime_type: mediaInfo?.mimeType || null
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

    console.log(`💾 ${direction} message saved: ${data.id}${mediaInfo?.type ? ` (${mediaInfo.type})` : ''}`);
    return data.id;
  } catch (error) {
    console.error(`❌ Error in saveMessage:`, error);
    return null;
  }
}

// ========== AUDIO TRANSCRIPTION & TTS ==========

async function transcribeAudio(
  supabase: any, 
  audioUrl: string
): Promise<string | null> {
  try {
    console.log('🎤 Transcribing audio from Make:', audioUrl);
    
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioUrl }
    });
    
    if (error || !data?.success) {
      console.error('❌ Transcription failed:', error || data?.error);
      return null;
    }
    
    console.log('✅ Audio transcribed:', data.text?.substring(0, 100));
    return data.text;
    
  } catch (error) {
    console.error('❌ Error in transcribeAudio:', error);
    return null;
  }
}

async function getAudioConfig(supabase: any): Promise<AudioConfig | null> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .maybeSingle();
    
    if (!data?.setting_value) return null;
    
    const config = data.setting_value;
    return {
      audio_enabled: config.audio_enabled || false,
      audio_voice_id: config.audio_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      audio_voice_name: config.audio_voice_name || 'Sarah',
      audio_mode: config.audio_mode || 'text_and_audio',
      audio_max_chars: config.audio_max_chars || 1000
    };
  } catch (error) {
    console.error('❌ Error getting audio config:', error);
    return null;
  }
}

async function generateAudioResponse(
  text: string,
  audioConfig: AudioConfig
): Promise<AudioResult | null> {
  if (!audioConfig.audio_enabled) return null;
  
  // Limit text length for audio
  const textToConvert = text.length > audioConfig.audio_max_chars 
    ? text.substring(0, audioConfig.audio_max_chars) + '...'
    : text;
  
  try {
    console.log('🎙️ Generating TTS audio for Make response...');
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not configured');
      return null;
    }

    // Call ElevenLabs TTS API directly
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${audioConfig.audio_voice_id}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: textToConvert,
          model_id: 'eleven_multilingual_v2',
          output_format: 'mp3_44100_128',
          voice_settings: {
            stability: 0.70,
            similarity_boost: 0.85,
            style: 0.25,
            use_speaker_boost: true,
            speed: 0.92,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ ElevenLabs API error:', response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('✅ MP3 audio generated:', audioBuffer.byteLength, 'bytes');

    // Upload to Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const storageSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const fileName = `ai-audio-${Date.now()}.mp3`;
    const { error: uploadError } = await storageSupabase
      .storage
      .from('whatsapp-media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return null;
    }

    // Get public URL
    const { data: urlData } = storageSupabase
      .storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('✅ Audio uploaded:', urlData.publicUrl);
    
    return {
      audioUrl: urlData.publicUrl,
      isVoiceMessage: false, // MP3 plays as audio file, not voice message
      contentType: 'audio/mpeg'
    };
    
  } catch (error) {
    console.error('❌ Error in generateAudioResponse:', error);
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
    
    // Debug: log raw payload for analysis
    console.log('📦 Raw payload keys:', Object.keys(body).join(', '));
    
    const { 
      phone, 
      message, 
      contact_name, 
      message_id, 
      timestamp, 
      message_type,
      media_url,
      media_id,
      media_mime,
      media_caption,
      media_filename,
      button_text,
      button_payload
    } = body;
    
    // Log button data if present
    if (button_text || button_payload) {
      console.log(`🔘 Button data received - text: "${button_text}", payload: "${button_payload}"`);
    }

    // Check if this is a status callback (no phone = likely delivery/read notification)
    // These callbacks don't have the data we need, so we skip them silently with 200 OK
    if (!phone && !message && !media_url) {
      console.log('📌 Ignoring status callback (no phone/message/media)');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'status_callback' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Make webhook received - Phone: ${phone}, Type: ${message_type || 'text'}, Message: "${message?.substring(0, 50) || '[media/button]'}..."`);

    // Determine message content based on type
    let messageContent = message || '';
    let mediaInfo: MediaInfo | undefined;
    let mediaProcessed: { type: string; transcribed?: boolean; transcription_preview?: string } | undefined;

    // Handle button type - extract content from button click
    const isButton = message_type === 'button';
    const isAudio = message_type === 'audio' || message_type === 'voice';
    const isMedia = ['image', 'video', 'document', 'sticker'].includes(message_type || '');

    if (isButton) {
      // Button click from template - use button_text as the message content
      messageContent = button_text || button_payload || message || '[Botão clicado]';
      console.log(`🔘 Button message detected - using content: "${messageContent}"`);
      
      mediaProcessed = {
        type: 'button'
      };
    } else if (isAudio && media_url) {
      // Transcribe audio via Whisper
      console.log(`🎤 Audio message detected, transcribing...`);
      const transcribedText = await transcribeAudio(supabase, media_url);
      
      if (transcribedText) {
        messageContent = transcribedText;
        mediaProcessed = {
          type: 'audio',
          transcribed: true,
          transcription_preview: transcribedText.substring(0, 100)
        };
        console.log(`🎤 Audio transcribed: "${messageContent.substring(0, 50)}..."`);
      } else {
        messageContent = '[O cliente enviou um áudio que não pude transcrever. Por favor, peça para ele digitar a mensagem.]';
        mediaProcessed = {
          type: 'audio',
          transcribed: false
        };
        console.log('⚠️ Audio transcription failed, using fallback message');
      }
      
      mediaInfo = {
        type: 'audio',
        url: media_url,
        caption: transcribedText || undefined,
        mimeType: media_mime
      };
      
    } else if (isMedia && media_url) {
      // For other media, use caption or generic message
      const mediaLabel = message_type === 'image' ? 'Imagem' 
        : message_type === 'video' ? 'Vídeo' 
        : message_type === 'sticker' ? 'Sticker'
        : 'Documento';
      
      messageContent = media_caption || `[${mediaLabel} recebido]`;
      
      mediaInfo = {
        type: message_type,
        url: media_url,
        caption: media_caption,
        filename: media_filename,
        mimeType: media_mime
      };
      
      mediaProcessed = {
        type: message_type || 'unknown'
      };
      
      console.log(`📎 Media received: ${message_type} - ${media_url}`);
    }

    // Validate required fields (phone is always required, message OR media_url must exist)
    if (!phone || (!message && !media_url)) {
      console.warn('⚠️ Incomplete payload:', { phone: !!phone, message: !!message, media_url: !!media_url, keys: Object.keys(body) });
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: phone and (message or media_url)' }),
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

    // Save inbound message with media info
    await saveMessage(supabase, conversationId, phoneNumber, messageContent, 'inbound', message_id, mediaInfo);

    // Get conversation history
    const history = conversationId 
      ? await getConversationHistory(supabase, conversationId)
      : [];
    
    // Provide context to AI about media
    let aiPromptMessage = messageContent;
    
    if (isAudio && mediaProcessed?.transcribed) {
      aiPromptMessage = `[O cliente enviou um áudio que foi transcrito automaticamente]\n\n"${messageContent}"`;
    } else if (isMedia) {
      aiPromptMessage = `[O cliente enviou ${message_type === 'image' ? 'uma imagem' : message_type === 'video' ? 'um vídeo' : 'um documento'}${media_caption ? ` com legenda: "${media_caption}"` : ''}]`;
    }

    // Detect which AI agent to use
    let aiResponse = '';
    let agent = 'nina';
    let developmentDetected: string | null = null;
    let c2sTransferred = false;
    let sendTriageTemplate = false; // Flag to instruct Make to send triagem_ia template

    // 1. Check if this is a development lead (from portal/landing page)
    const developmentLead = await checkDevelopmentLead(supabase, phoneNumber);
    
    // 2. Or detect development mentioned in message
    const mentionedDevelopment = await detectDevelopmentFromMessage(supabase, messageContent);

    // List of developments handled by direct WhatsApp API (not Make)
    const DIRECT_API_DEVELOPMENTS = ['villa maggiore'];
    
    if (developmentLead || mentionedDevelopment) {
      const devInfo = developmentLead || mentionedDevelopment!;
      const devNameLower = (devInfo.development_name || '').toLowerCase();
      
      // Check if this development is handled by direct API
      if (DIRECT_API_DEVELOPMENTS.some(d => devNameLower.includes(d))) {
        console.log(`⛔ Development "${devInfo.development_name}" is handled by direct WhatsApp API (48 23980016), not Make (48 91631011). Skipping.`);
        return new Response(
          JSON.stringify({
            success: true,
            skipped: true,
            reason: 'handled_by_direct_api',
            message: 'Este empreendimento é atendido pelo número da API direta do WhatsApp'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Use Helena Smolka (ai-arya-vendas logic)
      agent = 'helena';
      developmentDetected = devInfo.development_name;
      
      console.log(`🏗️ Routing to Helena for development: ${devInfo.development_name}`);

      const development = await getDevelopment(supabase, devInfo.development_id);
      
      if (development) {
        const isFirstMessage = history.length === 0;
        
        // Fetch existing contact name from database to avoid re-asking
        const existingContactName = await getContactName(supabase, phoneNumber);
        const resolvedContactName = existingContactName || developmentLead?.contact_name || contact_name;
        console.log(`👤 Contact name resolved: ${resolvedContactName || 'not set'}`);
        
        // Build prompt with history for context awareness
        const systemPrompt = buildQuickTransferPrompt(development, resolvedContactName, isFirstMessage, history);
        const result = await callOpenAI(systemPrompt, history, aiPromptMessage, toolsQuickTransfer);
        
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
        // Development not found, fallback to triage flow
        console.log('⚠️ Development not found, entering triage flow');
        agent = 'helena';
        
        // Get conversation state for triage
        const convState = await getConversationState(supabase, phoneNumber);
        const currentStage = convState?.triage_stage || null;
        const existingName = await getContactName(supabase, phoneNumber);
        
        if (!currentStage || currentStage === 'greeting') {
          // First message - send greeting and ask for name
          const greetingMsg = `Olá! Aqui é a Helena da Smolka Imóveis 🏠`;
          
          if (existingName) {
            // Already have name, skip to triage - send template with buttons
            aiResponse = `${greetingMsg}\n\nPrazer em falar com você, ${existingName}! 😊`;
            sendTriageTemplate = true;
            await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
          } else {
            aiResponse = `${greetingMsg}\n\nComo você se chama?`;
            await updateTriageStage(supabase, phoneNumber, 'awaiting_name');
          }
        } else if (currentStage === 'awaiting_name') {
          // Expecting name
          const detectedName = extractNameFromMessage(messageContent);
          
          if (detectedName) {
            await saveContactNameMake(supabase, phoneNumber, detectedName);
            aiResponse = `Prazer, ${detectedName}! 😊`;
            sendTriageTemplate = true;
            await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
          } else {
            aiResponse = 'Desculpa, não consegui entender 😅 Pode me dizer o seu nome?';
          }
      } else if (currentStage === 'awaiting_triage') {
        // Expecting triage choice - check button first, then text
        const department = isButton 
          ? inferDepartmentFromButton(button_text, button_payload) || inferDepartmentFromText(messageContent)
          : inferDepartmentFromText(messageContent);
        
        if (department && conversationId) {
          await assignDepartmentMake(supabase, phoneNumber, conversationId, department);
          
          const customerName = existingName || '';
          const nameGreeting = customerName ? `, ${customerName}` : '';
          
          // Department-specific pre-attendance prompts
          if (department === 'locacao') {
            aiResponse = `Ótimo${nameGreeting}! 🏠\n\nVou te ajudar a encontrar o imóvel ideal para alugar em Florianópolis.\n\nPra eu buscar as melhores opções, me conta:\n\n📍 Qual região você prefere? (Centro, praias do Norte, Sul da Ilha, Continente...)`;
          } else if (department === 'vendas') {
            aiResponse = `Excelente${nameGreeting}! 🏡\n\nVou te ajudar a encontrar o imóvel dos seus sonhos.\n\nPra começar: você está buscando algo para *morar* ou para *investir*?`;
          } else {
            aiResponse = `Perfeito${nameGreeting}! 😊\n\nSou da Smolka e vou te ajudar com sua solicitação.\n\nPor favor, me conta qual é sua demanda:\n\n📄 Boleto / 2ª via\n📝 Contrato\n🔧 Manutenção\n❓ Outra questão`;
          }
          
          console.log(`✅ Department assigned from triage: ${department}`);
        } else {
          // Didn't understand, resend template
          sendTriageTemplate = true;
          aiResponse = `Desculpa, não entendi sua escolha 😅\n\nPor favor, toque em um dos botões abaixo:`;
        }
      } else {
        // Triage completed, use general AI
        const systemPrompt = buildVirtualAgentPrompt();
        const result = await callOpenAI(systemPrompt, history, aiPromptMessage);
        aiResponse = result.content;
      }
      }
    } else {
      // ========== TRIAGE FLOW FOR NEW LEADS ==========
      agent = 'helena';
      console.log('🤖 New lead - entering triage flow');
      
      // Get conversation state for triage
      const convState = await getConversationState(supabase, phoneNumber);
      const currentStage = convState?.triage_stage || null;
      const existingName = await getContactName(supabase, phoneNumber);
      
      console.log(`📊 Triage state - Stage: ${currentStage}, Name: ${existingName || 'not set'}`);
      
      if (!currentStage || currentStage === 'greeting') {
        // First message - send greeting and ask for name
        const greetingMsg = `Olá! Aqui é a Helena da Smolka Imóveis 🏠`;
        
        if (existingName) {
          // Already have name, skip to triage - send template with buttons
          aiResponse = `${greetingMsg}\n\nPrazer em falar com você, ${existingName}! 😊`;
          sendTriageTemplate = true;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
        } else {
          aiResponse = `${greetingMsg}\n\nComo você se chama?`;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_name');
        }
      } else if (currentStage === 'awaiting_name') {
        // Expecting name
        const detectedName = extractNameFromMessage(messageContent);
        
        if (detectedName) {
          await saveContactNameMake(supabase, phoneNumber, detectedName);
          aiResponse = `Prazer, ${detectedName}! 😊`;
          sendTriageTemplate = true;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
        } else {
          aiResponse = 'Desculpa, não consegui entender 😅 Pode me dizer o seu nome?';
        }
      } else if (currentStage === 'awaiting_triage') {
        // Expecting triage choice - check button first, then text
        const department = isButton 
          ? inferDepartmentFromButton(button_text, button_payload) || inferDepartmentFromText(messageContent)
          : inferDepartmentFromText(messageContent);
        
        if (department && conversationId) {
          await assignDepartmentMake(supabase, phoneNumber, conversationId, department);
          
          const customerName = existingName || '';
          const nameGreeting = customerName ? `, ${customerName}` : '';
          
          // Department-specific pre-attendance prompts
          if (department === 'locacao') {
            aiResponse = `Ótimo${nameGreeting}! 🏠\n\nVou te ajudar a encontrar o imóvel ideal para alugar em Florianópolis.\n\nPra eu buscar as melhores opções, me conta:\n\n📍 Qual região você prefere? (Centro, praias do Norte, Sul da Ilha, Continente...)`;
          } else if (department === 'vendas') {
            aiResponse = `Excelente${nameGreeting}! 🏡\n\nVou te ajudar a encontrar o imóvel dos seus sonhos.\n\nPra começar: você está buscando algo para *morar* ou para *investir*?`;
          } else {
            aiResponse = `Perfeito${nameGreeting}! 😊\n\nSou da Smolka e vou te ajudar com sua solicitação.\n\nPor favor, me conta qual é sua demanda:\n\n📄 Boleto / 2ª via\n📝 Contrato\n🔧 Manutenção\n❓ Outra questão`;
          }
          
          console.log(`✅ Department assigned from triage: ${department}`);
        } else {
          // Didn't understand, resend template
          sendTriageTemplate = true;
          aiResponse = `Desculpa, não entendi sua escolha 😅\n\nPor favor, toque em um dos botões abaixo:`;
        }
      } else {
        // Triage completed, use general AI
        console.log('🤖 Triage completed, using Helena virtual agent');
        const systemPrompt = buildVirtualAgentPrompt();
        const result = await callOpenAI(systemPrompt, history, aiPromptMessage);
        aiResponse = result.content;
      }
    }

    // ========== AUDIO TTS GENERATION ==========
    
    // Get audio configuration
    const audioConfig = await getAudioConfig(supabase);
    let audioResult: AudioResult | null = null;

    // Generate audio ONLY if user sent a voice/audio message (rapport strategy)
    // This creates a more personal connection by matching their communication style
    const userSentVoice = message_type === 'audio' || message_type === 'voice';
    const shouldGenerateAudio = audioConfig?.audio_enabled && aiResponse && userSentVoice;

    if (shouldGenerateAudio) {
      console.log('🎙️ Generating audio response to match user voice message (rapport strategy)');
      audioResult = await generateAudioResponse(aiResponse, audioConfig);
      
      if (audioResult) {
        console.log(`🎤 Audio generated: ${audioResult.audioUrl}`);
      }
    } else if (audioConfig?.audio_enabled && !userSentVoice) {
      console.log('💬 Text-only response (user sent text, not voice)');
    }

    // Save outbound message (AI response) with audio info if available
    if (aiResponse && conversationId) {
      await saveMessage(
        supabase, 
        conversationId, 
        phoneNumber, 
        aiResponse, 
        'outbound',
        undefined,
        audioResult ? {
          type: 'audio',
          url: audioResult.audioUrl,
          mimeType: audioResult.contentType
        } : undefined
      );
    }

    // Update conversation timestamp
    if (conversationId) {
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);
    }

    // Log the interaction
    const { error: logError } = await supabase.from('activity_logs').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      action_type: 'make_webhook_processed',
      target_table: 'messages',
      target_id: phoneNumber,
      metadata: {
        agent,
        development_detected: developmentDetected,
        c2s_transferred: c2sTransferred,
        conversation_id: conversationId,
        message_preview: messageContent.substring(0, 100),
        media_processed: mediaProcessed || null,
        audio_generated: !!audioResult
      }
    });

    if (logError) {
      console.error('❌ Error logging activity:', logError);
    }

    let agentLabel = agent === 'helena' ? 'helena' : 'helena';
    console.log(`✅ Make webhook processed - Agent: ${agentLabel}, Response length: ${aiResponse.length}${mediaProcessed ? `, Media: ${mediaProcessed.type}` : ''}${audioResult ? ', Audio: ✅' : ''}`);

    // Get current triage stage for response metadata
    const finalState = await getConversationState(supabase, phoneNumber);
    return new Response(
      JSON.stringify({
        success: true,
        result: aiResponse,
        phone: phoneNumber,
        agent,
        conversation_id: conversationId,
        // Template to send (for triage flow with buttons)
        send_template: sendTriageTemplate ? {
          name: 'triagem',
          language: 'pt_BR'
        } : null,
        // Audio information for Make to use
        audio: audioResult ? {
          url: audioResult.audioUrl,
          type: audioResult.contentType,
          is_voice_message: audioResult.isVoiceMessage
        } : null,
        metadata: {
          development_detected: developmentDetected,
          c2s_transferred: c2sTransferred,
          contact_name: contact_name,
          media_processed: mediaProcessed || null,
          audio_enabled: audioConfig?.audio_enabled || false,
          audio_mode: audioConfig?.audio_mode || null,
          triage_stage: finalState?.triage_stage || null
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
