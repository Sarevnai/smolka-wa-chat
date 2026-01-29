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
  media_url?: string;
  media_id?: string;
  media_mime?: string;
  media_caption?: string;
  media_filename?: string;
  button_text?: string;
  button_payload?: string;
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

// ========== AI AGENT CONFIG (FROM ai-virtual-agent) ==========

interface AIAgentConfig {
  agent_name: string;
  company_name: string;
  company_description: string;
  services: string[];
  tone: 'formal' | 'casual' | 'friendly' | 'technical';
  limitations: string[];
  faqs: { question: string; answer: string }[];
  custom_instructions: string;
  greeting_message: string;
  fallback_message: string;
  ai_provider: 'lovable' | 'openai';
  ai_model: string;
  max_tokens: number;
  max_history_messages: number;
  humanize_responses: boolean;
  fragment_long_messages: boolean;
  message_delay_ms: number;
  emoji_intensity: 'none' | 'low' | 'medium';
  use_customer_name: boolean;
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_channel_mirroring: boolean;
  audio_max_chars: number;
  target_audience: string;
  competitive_advantages: string[];
  company_values: string;
  service_areas: string[];
  rapport_enabled: boolean;
  rapport_use_name: boolean;
  rapport_mirror_language: boolean;
  rapport_show_empathy: boolean;
  rapport_validate_emotions: boolean;
  triggers_enabled: boolean;
  trigger_urgency: boolean;
  trigger_scarcity: boolean;
  trigger_social_proof: boolean;
  trigger_authority: boolean;
  social_proof_text: string;
  authority_text: string;
  objections: { objection: string; response: string }[];
  knowledge_base_url: string;
  knowledge_base_content: string;
  knowledge_base_last_update: string;
  spin_enabled: boolean;
  spin_situation_questions: string[];
  spin_problem_questions: string[];
  spin_implication_questions: string[];
  spin_need_questions: string[];
  escalation_criteria: string[];
  vista_integration_enabled: boolean;
}

const defaultConfig: AIAgentConfig = {
  agent_name: 'Helena',
  company_name: 'Smolka Imóveis',
  company_description: 'Administradora de imóveis especializada em locação e gestão de propriedades.',
  services: ['Locação de imóveis', 'Gestão de propriedades', 'Administração de condomínios'],
  tone: 'friendly',
  limitations: [],
  faqs: [],
  custom_instructions: '',
  greeting_message: 'Olá! Sou a {agent_name} da {company_name}. Como posso ajudá-lo?',
  fallback_message: 'Entendi sua solicitação. Um de nossos atendentes entrará em contato no próximo dia útil.',
  ai_provider: 'openai',
  ai_model: 'gpt-4o-mini',
  max_tokens: 250,
  max_history_messages: 5,
  humanize_responses: true,
  fragment_long_messages: true,
  message_delay_ms: 2000,
  emoji_intensity: 'low',
  use_customer_name: true,
  audio_enabled: false,
  audio_voice_id: '',
  audio_voice_name: 'Sarah',
  audio_mode: 'text_and_audio',
  audio_channel_mirroring: true,
  audio_max_chars: 400,
  target_audience: '',
  competitive_advantages: [],
  company_values: '',
  service_areas: [],
  rapport_enabled: true,
  rapport_use_name: true,
  rapport_mirror_language: true,
  rapport_show_empathy: true,
  rapport_validate_emotions: true,
  triggers_enabled: true,
  trigger_urgency: true,
  trigger_scarcity: true,
  trigger_social_proof: true,
  trigger_authority: true,
  social_proof_text: '',
  authority_text: '',
  objections: [],
  knowledge_base_url: '',
  knowledge_base_content: '',
  knowledge_base_last_update: '',
  spin_enabled: true,
  spin_situation_questions: [],
  spin_problem_questions: [],
  spin_implication_questions: [],
  spin_need_questions: [],
  escalation_criteria: [],
  vista_integration_enabled: true,
};

// ========== FLORIANÓPOLIS REGIONS MAPPING ==========

interface RegionInfo {
  nome: string;
  bairros: string[];
}

const FLORIANOPOLIS_REGIONS: Record<string, RegionInfo> = {
  norte: {
    nome: "Região Norte",
    bairros: [
      "Ingleses", "Ingleses do Rio Vermelho", "Santinho", "Canasvieiras", 
      "Jurerê", "Jurerê Internacional", "Daniela", "Cachoeira do Bom Jesus",
      "Ponta das Canas", "Lagoinha", "Vargem Grande", "Vargem Pequena",
      "Vargem do Bom Jesus", "Ratones", "Santo Antônio de Lisboa", "Sambaqui",
      "Praia Brava", "Rio Vermelho", "São João do Rio Vermelho"
    ]
  },
  sul: {
    nome: "Região Sul", 
    bairros: [
      "Campeche", "Rio Tavares", "Morro das Pedras", "Armação", "Armação do Pântano do Sul",
      "Pântano do Sul", "Ribeirão da Ilha", "Costa de Dentro", "Carianos",
      "Aeroporto", "Tapera", "Base Aérea", "Alto Ribeirão", "Caeira da Barra do Sul",
      "Costeira do Pirajubaé", "Saco dos Limões"
    ]
  },
  leste: {
    nome: "Região Leste",
    bairros: [
      "Lagoa da Conceição", "Barra da Lagoa", "Costa da Lagoa", "Canto da Lagoa",
      "Praia Mole", "Joaquina", "Praia da Joaquina", "Retiro da Lagoa", 
      "Canto dos Araçás", "Porto da Lagoa"
    ]
  },
  centro: {
    nome: "Região Central",
    bairros: [
      "Centro", "Agronômica", "Trindade", "Córrego Grande", "Pantanal",
      "Santa Mônica", "Itacorubi", "João Paulo", "Monte Verde", "Saco Grande",
      "José Mendes", "Prainha", "Carvoeira", "Serrinha"
    ]
  },
  continente: {
    nome: "Continente",
    bairros: [
      "Estreito", "Coqueiros", "Itaguaçu", "Abraão", "Capoeiras", "Bom Abrigo",
      "Balneário", "Coloninha", "Jardim Atlântico", "Monte Cristo", "Ponte do Imaruim",
      "Chico Mendes", "Vila Aparecida", "Sapé", "Bela Vista", "Kobrasol"
    ]
  }
};

function getAllNeighborhoods(): string[] {
  const all: string[] = [];
  for (const region of Object.values(FLORIANOPOLIS_REGIONS)) {
    all.push(...region.bairros);
  }
  return all;
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return 1 - matrix[len1][len2] / maxLen;
}

function normalizeNeighborhood(input: string): { normalized: string; confidence: number; original: string } {
  const trimmed = input.trim();
  const allNeighborhoods = getAllNeighborhoods();
  
  const exactMatch = allNeighborhoods.find(n => n.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return { normalized: exactMatch, confidence: 1.0, original: trimmed };
  
  const partialMatch = allNeighborhoods.find(n => 
    n.toLowerCase().startsWith(trimmed.toLowerCase()) ||
    trimmed.toLowerCase().startsWith(n.toLowerCase())
  );
  if (partialMatch) return { normalized: partialMatch, confidence: 0.95, original: trimmed };
  
  let bestMatch = trimmed;
  let bestScore = 0;
  
  for (const neighborhood of allNeighborhoods) {
    const similarity = stringSimilarity(trimmed, neighborhood);
    if (similarity > bestScore && similarity >= 0.6) {
      bestScore = similarity;
      bestMatch = neighborhood;
    }
  }
  
  return { normalized: bestMatch, confidence: bestScore, original: trimmed };
}

function isRegionName(input: string): boolean {
  const normalized = input.toLowerCase().trim()
    .replace(/^região\s+/, '')
    .replace(/^regiao\s+/, '');
  return Object.keys(FLORIANOPOLIS_REGIONS).includes(normalized);
}

function expandRegionToNeighborhoods(input: string): { 
  isRegion: boolean;
  neighborhoods: string[];
  regionName?: string;
  suggestion?: string;
} {
  const normalized = input.toLowerCase().trim()
    .replace(/^região\s+/, '')
    .replace(/^regiao\s+/, '');
  
  if (FLORIANOPOLIS_REGIONS[normalized]) {
    const region = FLORIANOPOLIS_REGIONS[normalized];
    return {
      isRegion: true,
      neighborhoods: region.bairros,
      regionName: region.nome,
      suggestion: `A ${region.nome} tem ótimas opções! Posso sugerir: ${region.bairros.slice(0, 4).join(', ')}... Tem preferência?`
    };
  }
  
  const result = normalizeNeighborhood(input);
  
  if (result.confidence < 0.8 && result.confidence > 0.5) {
    return {
      isRegion: false,
      neighborhoods: [result.normalized],
      suggestion: `Você quis dizer ${result.normalized}?`
    };
  }
  
  return { isRegion: false, neighborhoods: [result.normalized] };
}

function generateRegionKnowledge(): string {
  const lines: string[] = ['\n📍 CONHECIMENTO LOCAL DE FLORIANÓPOLIS:', ''];
  
  for (const [key, region] of Object.entries(FLORIANOPOLIS_REGIONS)) {
    lines.push(`${region.nome.toUpperCase()}: ${region.bairros.slice(0, 8).join(', ')}${region.bairros.length > 8 ? '...' : ''}`);
  }
  
  lines.push('');
  lines.push('⚡ REGIÕES:');
  lines.push('- "norte" → Ingleses, Canasvieiras, Jurerê...');
  lines.push('- "sul" → Campeche, Armação, Ribeirão...');
  lines.push('- "leste" ou "lagoa" → Lagoa da Conceição, Barra...');
  lines.push('- "centro" → Trindade, Agronômica, Itacorubi...');
  lines.push('- "continente" → Estreito, Coqueiros...');
  lines.push('');
  lines.push('⚡ CORREÇÃO DE ERROS: "Tridade" → "Trindade", "Ingleseis" → "Ingleses"');
  
  return lines.join('\n');
}

// ========== PROPERTY LINK EXTRACTION ==========

function extractPropertyCodeFromUrl(message: string): string | null {
  if (!message) return null;
  
  const smolkaUrlMatch = message.match(/smolkaimoveis\.com\.br\/imovel\/([^\s]+)/i);
  if (smolkaUrlMatch && smolkaUrlMatch[1]) {
    const urlPath = smolkaUrlMatch[1];
    const allNumbers = urlPath.match(/\d+/g);
    if (allNumbers && allNumbers.length > 0) {
      const lastNumber = allNumbers[allNumbers.length - 1];
      if (lastNumber.length >= 3 && lastNumber.length <= 6) {
        console.log(`🔗 Property code extracted from URL: ${lastNumber}`);
        return lastNumber;
      }
    }
  }
  
  const fallbackPatterns = [
    /codigo[=\/](\d{3,6})\b/i,
    /\/imovel\/(\d{3,6})(?:\s|$|\/|\?)/i
  ];
  
  for (const pattern of fallbackPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

function containsPropertyUrl(message: string): boolean {
  return /smolkaimoveis\.com\.br\/imovel\//i.test(message) ||
         /vistasoft.*imovel/i.test(message);
}

// ========== HUMANIZATION ==========

const emojiSets = {
  greeting: ['😊', '👋', '🙂', '☺️'],
  agreement: ['✅', '👍', '😊', '🙂'],
  thinking: ['🤔', '💭', '📋', ''],
  sorry: ['😔', '🙏', '', ''],
  help: ['💡', '📞', '🏠', ''],
  thanks: ['🙏', '😊', '✨', ''],
  farewell: ['👋', '😊', '🙂', ''],
};

function getRandomEmoji(context: keyof typeof emojiSets, intensity: string): string {
  if (intensity === 'none') return '';
  const set = emojiSets[context];
  const maxIndex = intensity === 'low' ? 2 : set.length;
  const emoji = set[Math.floor(Math.random() * maxIndex)];
  return emoji ? ` ${emoji}` : '';
}

const humanPhrases = {
  thinking: ['Deixa eu verificar...', 'Um momento...', 'Vou conferir isso...'],
  agreement: ['Entendi!', 'Certo!', 'Perfeito!', 'Claro!'],
  transition: ['Olha só,', 'Então,', 'Bom,', 'Veja bem,'],
  empathy: ['Entendo sua situação.', 'Compreendo.', 'Faz sentido.'],
};

function getRandomPhrase(type: keyof typeof humanPhrases): string {
  const phrases = humanPhrases[type];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ========== VALIDATION ==========

const FORBIDDEN_RESPONSE_PATTERNS = [
  /quintoandar/i,
  /vivareal/i,
  /zap\s*im[oó]veis/i,
  /olx/i,
  /imovelweb/i,
  /outras?\s*imobili[aá]rias?/i,
];

function validateAIResponse(response: string): { valid: boolean; reason?: string } {
  if (!response) return { valid: true };
  
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    if (pattern.test(response)) {
      console.log(`🚫 Invalid AI response - matched pattern: ${pattern}`);
      return { valid: false, reason: `Contains forbidden content` };
    }
  }
  return { valid: true };
}

const FALLBACK_RESPONSE = "Olá! Sou da Smolka Imóveis 🏠 Como posso ajudar você?";

// ========== CONFIG LOADERS ==========

async function getAIAgentConfig(supabase: any): Promise<AIAgentConfig> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .maybeSingle();
    
    return data?.setting_value 
      ? { ...defaultConfig, ...data.setting_value }
      : defaultConfig;
  } catch (error) {
    console.error('❌ Error loading AI agent config:', error);
    return defaultConfig;
  }
}

interface EssentialQuestion {
  id: string;
  question: string;
  category: string;
  isQualifying: boolean;
  enabled: boolean;
}

interface AIBehaviorConfig {
  id: string;
  essential_questions: EssentialQuestion[];
  functions: any[];
  reengagement_hours: number;
  send_cold_leads: boolean;
  require_cpf_for_visit: boolean;
}

async function getAIBehaviorConfig(supabase: any): Promise<AIBehaviorConfig | null> {
  try {
    const { data } = await supabase
      .from('ai_behavior_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('❌ Error loading AI behavior config:', error);
    return null;
  }
}

// ========== UTILITY FUNCTIONS ==========

function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

function getPhoneVariations(phoneNumber: string): string[] {
  const variations = [phoneNumber];
  
  if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
    variations.push(phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4));
  }
  if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
    variations.push(phoneNumber.slice(0, 4) + phoneNumber.slice(5));
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

// ========== OPENAI TOOLS WITH VISTA ==========

const toolsWithVista = [
  {
    type: "function",
    function: {
      name: "buscar_imoveis",
      description: "Busca imóveis no catálogo da Smolka Imóveis. Use quando o cliente quiser alugar ou comprar e tiver informado região/bairro.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            description: "Tipo do imóvel",
            enum: ["apartamento", "casa", "terreno", "comercial", "cobertura", "kitnet", "sobrado", "sala"]
          },
          bairro: {
            type: "string",
            description: "Nome do bairro de Florianópolis"
          },
          cidade: {
            type: "string",
            description: "Nome da cidade (padrão: Florianópolis)"
          },
          preco_min: {
            type: "number",
            description: "Valor mínimo em reais"
          },
          preco_max: {
            type: "number",
            description: "Valor máximo em reais"
          },
          quartos: {
            type: "number",
            description: "Número de dormitórios"
          },
          finalidade: {
            type: "string",
            description: "OBRIGATÓRIO. Use 'locacao' para alugar, 'venda' para comprar",
            enum: ["venda", "locacao"]
          }
        },
        required: ["finalidade"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor. Use após qualificar o cliente (nome, interesse, tipo, região).",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente" },
          interesse: { type: "string", description: "Interesse: morar, investir, alugar" },
          tipo_imovel: { type: "string", description: "Tipo de imóvel desejado" },
          bairro: { type: "string", description: "Bairro de interesse" },
          faixa_preco: { type: "string", description: "Faixa de preço" },
          quartos: { type: "number", description: "Número de quartos" },
          resumo: { type: "string", description: "Resumo da conversa" }
        },
        required: ["nome", "interesse"]
      }
    }
  }
];

const toolsQuickTransfer = [
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor especializado no C2S.",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do cliente" },
          interesse: { type: "string", description: "Interesse: morar, investir, conhecer" },
          motivacao: { type: "string", description: "O que chamou atenção do cliente" },
          resumo: { type: "string", description: "Resumo da conversa" }
        },
        required: ["nome", "interesse", "resumo"]
      }
    }
  }
];

// ========== PROMPT BUILDERS ==========

function buildQuickTransferPrompt(dev: Development, contactName?: string, isFirstMessage?: boolean, history?: ConversationMessage[]): string {
  const hasName = !!contactName && contactName.toLowerCase() !== 'lead sem nome';
  const hasHistory = history && history.length > 0;
  
  return `Você é a Helena, assistente de atendimento da Smolka Imóveis, especializada em apresentar o empreendimento ${dev.name}.

${hasHistory ? `📜 CONTEXTO: Esta conversa já tem histórico. NÃO repita perguntas já respondidas.
${hasName ? `🔹 NOME DO CLIENTE: ${contactName} - USE ESTE NOME!` : ''}` : ''}

🎯 OBJETIVO:
- Qualificar o lead: nome, morar ou investir, prioridades
- Encaminhar para especialista humano com resumo

📋 REGRAS:
- Tom cordial e objetivo
- Uma pergunta por mensagem
- Mensagens curtas
- Use emojis com moderação

${isFirstMessage ? `
🆕 PRIMEIRA MENSAGEM:
${hasName ? `Responda: "Prazer em te conhecer, ${contactName}! 😊 Você está buscando algo para morar ou para investir?"` : `Responda APENAS: "Pra começar bem, como posso te chamar?"`}
` : ''}

🔄 ENCAMINHAMENTO:
Após ter nome + objetivo + prioridade, use enviar_lead_c2s com resumo.
- NÃO responda perguntas técnicas detalhadas
- Seja simpática, breve e eficiente`;
}

function buildLocacaoPrompt(config: AIAgentConfig, contactName?: string, history?: ConversationMessage[], qualificationData?: QualificationData | null): string {
  const hasName = !!contactName;
  const hasHistory = history && history.length > 0;
  const contextSummary = buildContextSummary(qualificationData || null);
  
  return `🚨 REGRA ZERO: Você é ${config.agent_name} da ${config.company_name} em Florianópolis/SC.

${hasName ? `👤 CLIENTE: ${contactName} - Use o nome naturalmente.` : '⭐ Ainda não sabemos o nome. Pergunte: "A propósito, como posso te chamar?"'}

${hasHistory ? `📜 CONTEXTO: Já há histórico. NÃO repita perguntas já respondidas.` : ''}

${contextSummary}

⛔ ANTI-LOOP - LEIA COM ATENÇÃO:
- Se dados acima mostram "Região: Centro", NÃO pergunte região
- Se dados mostram "Quartos: 2", NÃO pergunte quartos
- NUNCA repita uma pergunta já respondida
- Se cliente já disse algo, use essa informação

⚡ REGRA DE OURO - UMA PERGUNTA POR VEZ:
- NUNCA faça 2 perguntas na mesma mensagem
- Se falta região, pergunte APENAS região
- Se falta tipo, pergunte APENAS tipo
- Após cada resposta, faça a PRÓXIMA pergunta
- Só busque imóveis quando tiver 2+ critérios

💬 EXEMPLOS CORRETOS:
- ✅ "Qual região você prefere?"
- ✅ "Quantos quartos você precisa?"
- ❌ "Qual região e quantos quartos?" (ERRADO - 2 perguntas)

🎯 OBJETIVO: Ajudar o cliente a ALUGAR um imóvel em Florianópolis.

📍 FLUXO DE ATENDIMENTO - LOCAÇÃO:
1. QUALIFICAÇÃO: Coletar região, tipo, quartos, faixa de preço (UMA pergunta por vez!)
2. BUSCA: Usar buscar_imoveis quando tiver 2+ critérios
3. APRESENTAÇÃO: Sistema envia 1 imóvel por vez
4. PERGUNTA: "Esse imóvel faz sentido pra você?"
5. AGUARDE resposta antes de mostrar outro

${generateRegionKnowledge()}

🏠 REGRAS PARA APRESENTAR IMÓVEIS:
- NUNCA envie lista grande. Sistema envia 1 imóvel por vez.
- Estrutura obrigatória:
  1. Contexto: "Encontrei um imóvel que pode combinar com o que você busca."
  2. Dados: tipo, bairro, quartos, preço, diferencial
  3. Pergunta: "Esse imóvel faz sentido pra você?"
- AGUARDE a resposta antes de mostrar outro imóvel
- Se cliente disser NÃO: pergunte o que não se encaixou
- Se cliente demonstrar INTERESSE: iniciar encaminhamento ao consultor

🚫 REGRA CRÍTICA - NUNCA AGENDAR VISITAS:
- NUNCA ofereça datas, horários ou confirmação de visita
- SEMPRE diga: "Quem vai agendar a visita é um consultor da Smolka Imóveis"
- SEMPRE diga: "Vou te conectar com um consultor especializado"

📤 FLUXO DE ENCAMINHAMENTO C2S:
Quando cliente demonstrar interesse ("gostei", "quero visitar", "pode marcar"):
1. Confirmar: "Perfeito! Posso te conectar com um consultor para organizar a visita?"
2. Se concordar: coletar/confirmar nome, telefone, código do imóvel
3. Usar enviar_lead_c2s com todos os dados
4. Mensagem final: "Pronto! Um consultor vai entrar em contato para tirar dúvidas e agendar a visita."
5. NÃO oferecer mais imóveis após transferência (a menos que cliente peça)

💬 ESTILO CONSULTIVO:
- "Encontrei um imóvel que pode combinar com o que você busca! 🏠"
- "Esse imóvel faz sentido pra você?"
- "Entendi! O que não se encaixou? Preço, tamanho ou localização?"
- "Vou te conectar com um consultor especializado 😊"`;
}

function buildVendasPrompt(config: AIAgentConfig, contactName?: string, history?: ConversationMessage[], qualificationData?: QualificationData | null): string {
  const hasName = !!contactName;
  const hasHistory = history && history.length > 0;
  const contextSummary = buildContextSummary(qualificationData || null);
  
  return `🚨 REGRA ZERO: Você é ${config.agent_name} da ${config.company_name} em Florianópolis/SC.

${hasName ? `👤 CLIENTE: ${contactName} - Use o nome naturalmente.` : '⭐ Ainda não sabemos o nome. Pergunte: "A propósito, como posso te chamar?"'}

${hasHistory ? `📜 CONTEXTO: Já há histórico. NÃO repita perguntas já respondidas.` : ''}

${contextSummary}

⛔ ANTI-LOOP - LEIA COM ATENÇÃO:
- Se dados acima mostram "Região: Centro", NÃO pergunte região
- Se dados mostram "Quartos: 2", NÃO pergunte quartos
- Se dados mostram "Objetivo: morar", NÃO pergunte objetivo
- NUNCA repita uma pergunta já respondida
- Se cliente já disse algo, use essa informação

⚡ REGRA DE OURO - UMA PERGUNTA POR VEZ:
- NUNCA faça 2 perguntas na mesma mensagem
- Se falta objetivo (morar/investir), pergunte APENAS isso
- Se falta região, pergunte APENAS região
- Após cada resposta, faça a PRÓXIMA pergunta
- Só busque imóveis quando tiver 2+ critérios

💬 EXEMPLOS CORRETOS:
- ✅ "Você busca para morar ou investir?"
- ✅ "Qual região te interessa?"
- ❌ "Qual região e quantos quartos?" (ERRADO - 2 perguntas)

🎯 OBJETIVO: Ajudar o cliente a COMPRAR/INVESTIR em imóvel.

📍 FLUXO DE ATENDIMENTO - VENDAS:
1. DESCOBRIR: Morar ou investir? (se não sabe)
2. QUALIFICAÇÃO: Região, tipo, quartos, faixa de preço (UMA pergunta por vez!)
3. BUSCA: Usar buscar_imoveis quando tiver 2+ critérios
4. APRESENTAÇÃO: Sistema envia 1 imóvel por vez
5. PERGUNTA: "Esse imóvel faz sentido pra você?"
6. AGUARDE resposta antes de mostrar outro

${generateRegionKnowledge()}

🏠 REGRAS PARA APRESENTAR IMÓVEIS:
- NUNCA envie lista grande. Sistema envia 1 imóvel por vez.
- Estrutura obrigatória:
  1. Contexto: "Encontrei um imóvel que pode combinar com o que você busca."
  2. Dados: tipo, bairro, quartos, preço, diferencial
  3. Pergunta: "Esse imóvel faz sentido pra você?"
- AGUARDE a resposta antes de mostrar outro imóvel
- Se cliente disser NÃO: pergunte o que não se encaixou
- Se cliente demonstrar INTERESSE: iniciar encaminhamento ao consultor

🚫 REGRA CRÍTICA - NUNCA AGENDAR VISITAS:
- NUNCA ofereça datas, horários ou confirmação de visita
- SEMPRE diga: "Quem vai agendar a visita é um consultor da Smolka Imóveis"
- SEMPRE diga: "Vou te conectar com um consultor especializado"

📤 FLUXO DE ENCAMINHAMENTO C2S:
Quando cliente demonstrar interesse ("gostei", "quero visitar", "pode marcar"):
1. Confirmar: "Perfeito! Posso te conectar com um consultor para organizar a visita?"
2. Se concordar: coletar/confirmar nome, telefone, código do imóvel
3. Usar enviar_lead_c2s com todos os dados
4. Mensagem final: "Pronto! Um consultor vai entrar em contato para tirar dúvidas e agendar a visita."
5. NÃO oferecer mais imóveis após transferência (a menos que cliente peça)

💬 ESTILO CONSULTIVO:
- "Encontrei um imóvel que pode combinar com o que você busca! 🏠"
- "Esse imóvel faz sentido pra você?"
- "Entendi! O que não se encaixou? Preço, tamanho ou localização?"
- "Vou te conectar com um consultor especializado 😊"`;
}

function buildAdminPrompt(config: AIAgentConfig, contactName?: string): string {
  const hasName = !!contactName;
  
  return `Você é ${config.agent_name} da ${config.company_name} - Setor Administrativo.

${hasName ? `👤 CLIENTE: ${contactName}` : ''}

🎯 OBJETIVO: Ajudar clientes que já são locatários ou proprietários.

📋 DEMANDAS COMUNS:
- 📄 Boleto / 2ª via de pagamento
- 📝 Contrato (renovação, rescisão, dúvidas)
- 🔧 Manutenção (solicitações, acompanhamento)
- 💰 Financeiro (pagamentos, cobranças)
- ❓ Outras questões administrativas

🔄 FLUXO:
1. Identificar a demanda específica
2. Coletar informações necessárias (contrato, imóvel, etc.)
3. Orientar próximos passos
4. Informar que um atendente vai dar continuidade

💬 ESTILO:
- Profissional e empático
- Mensagens objetivas
- Validar as preocupações do cliente

⚠️ LIMITAÇÕES:
- NÃO emita boletos (apenas oriente)
- NÃO resolva questões de manutenção (registre e encaminhe)
- Para assuntos complexos: "Vou registrar sua solicitação e um atendente entrará em contato."`;
}

function buildVirtualAgentPrompt(config: AIAgentConfig, contactName?: string): string {
  const hasName = !!contactName;
  
  return `Você é ${config.agent_name}, assistente virtual da ${config.company_name} 🏠

${hasName ? `👤 CLIENTE: ${contactName}` : ''}

OBJETIVO: Ajudar clientes de forma cordial e eficiente via WhatsApp.

CAPACIDADES:
- Tirar dúvidas sobre a empresa
- Explicar serviços (locação, vendas, administração)
- Encaminhar para o departamento correto
- Buscar imóveis no catálogo

${generateRegionKnowledge()}

REGRAS:
- Seja simpática e profissional
- Mensagens curtas e diretas
- Use emojis com moderação
- Responda em português brasileiro

Se não souber algo específico, diga que vai verificar com um especialista.`;
}

// ========== PROPERTY SEARCH & FORMAT ==========

async function searchProperties(supabase: any, params: Record<string, any>): Promise<any> {
  try {
    let normalizedParams = { ...params };
    
    if (params.bairro) {
      const expansion = expandRegionToNeighborhoods(params.bairro);
      
      if (expansion.isRegion) {
        console.log(`📍 Region detected: ${params.bairro} → ${expansion.regionName}`);
        normalizedParams.bairro = expansion.neighborhoods[0];
      } else {
        const normalized = normalizeNeighborhood(params.bairro);
        if (normalized.confidence < 1.0 && normalized.confidence >= 0.6) {
          console.log(`📍 Normalized "${params.bairro}" → "${normalized.normalized}"`);
        }
        normalizedParams.bairro = normalized.normalized;
      }
    }
    
    console.log('🏠 Searching properties:', normalizedParams);
    
    const { data, error } = await supabase.functions.invoke('vista-search-properties', {
      body: normalizedParams
    });

    if (error) {
      console.error('❌ Vista search error:', error);
      return { success: false, properties: [], error: error.message };
    }

    console.log(`✅ Vista returned ${data?.properties?.length || 0} properties`);
    return data;
  } catch (e) {
    console.error('❌ Error calling Vista:', e);
    return { success: false, properties: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

async function getPropertyByListingId(supabase: any, listingId: string): Promise<any | null> {
  try {
    console.log(`🏠 Fetching property: ${listingId}`);
    
    const { data, error } = await supabase.functions.invoke('vista-get-property', {
      body: { codigo: listingId }
    });
    
    if (error || !data?.success) return null;
    
    console.log(`✅ Found property:`, data.property?.codigo);
    return data.property;
  } catch (e) {
    console.error(`❌ Error fetching property:`, e);
    return null;
  }
}

function formatPropertyMessage(property: any): string {
  const lines = [`🏠 *${property.tipo} em ${property.bairro}*`];
  
  if (property.quartos > 0) {
    const suiteText = property.suites > 0 ? ` (${property.suites} suíte${property.suites > 1 ? 's' : ''})` : '';
    lines.push(`• ${property.quartos} quarto${property.quartos > 1 ? 's' : ''}${suiteText}`);
  }
  if (property.vagas > 0) lines.push(`• ${property.vagas} vaga${property.vagas > 1 ? 's' : ''}`);
  if (property.area_util > 0) lines.push(`• ${property.area_util}m²`);
  lines.push(`• ${property.preco_formatado}`);
  if (property.valor_condominio > 0) {
    lines.push(`• Condomínio: ${formatCurrency(property.valor_condominio)}`);
  }
  lines.push(`🔗 ${property.link}`);
  
  return lines.join('\n');
}

// ========== C2S INTEGRATION ==========

async function sendLeadToC2S(
  supabase: any,
  params: Record<string, any>, 
  phoneNumber: string, 
  conversationHistory: string,
  contactName?: string
): Promise<{ success: boolean; c2s_lead_id?: string; error?: string }> {
  try {
    console.log('🏢 Sending lead to C2S:', params);
    
    const { data, error } = await supabase.functions.invoke('c2s-create-lead', {
      body: {
        name: params.nome || contactName || 'Lead WhatsApp',
        phone: phoneNumber,
        type_negotiation: params.finalidade === 'locacao' ? 'Locação' : 'Compra',
        property_type: params.tipo_imovel,
        neighborhood: params.bairro,
        price_range: params.faixa_preco,
        bedrooms: params.quartos,
        description: params.interesse || params.resumo,
        conversation_history: conversationHistory,
      }
    });

    if (error) {
      console.error('❌ C2S send error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Lead sent to C2S');
    return { success: true, c2s_lead_id: data?.c2s_lead_id };
  } catch (e) {
    console.error('❌ Error calling C2S:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ========== CONSULTATIVE FLOW FUNCTIONS ==========

function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'neutral' {
  const positive = /gostei|interess|visitar|marcar|quero|esse|perfeito|[oó]timo|bom|show|pode ser|adorei|amei|lindo|maravilh|excelente|isso|sim|quero ver|agendar/i;
  const negative = /não|caro|longe|pequeno|grande|outro|próximo|diferente|menos|mais|demais|muito|acima|baixo|descartado|n[aã]o gostei|ruim|horr[ií]vel|nao/i;
  
  if (positive.test(message)) return 'positive';
  if (negative.test(message)) return 'negative';
  return 'neutral';
}

// ========== PRICE FLEXIBILITY DETECTION ==========

interface PriceFlexibility {
  type: 'increase' | 'decrease' | 'none';
  hasNewValue: boolean;
  suggestedQuestion: string | null;
}

function detectPriceFlexibility(message: string): PriceFlexibility {
  const lower = message.toLowerCase();
  
  // Patterns for price INCREASE without specific value
  const increaseNoValue = /pode ser mais caro|aceito pagar mais|flexivel|flexível|aumento|valor maior|preço maior|pago mais|posso pagar mais|aumentar o valor|subir o preço/i;
  
  // Patterns for price DECREASE without specific value
  const decreaseNoValue = /mais barato|menos|menor valor|mais em conta|orçamento menor|diminuir|reduzir|abaixar/i;
  
  // Check if message contains numeric value
  const hasValue = /\d+\s*(mil|k|reais|R\$|\$)/i.test(message) || /\d{4,}/i.test(message);
  
  if (increaseNoValue.test(lower) && !hasValue) {
    return {
      type: 'increase',
      hasNewValue: false,
      suggestedQuestion: 'Até quanto você considera pagar? Assim consigo buscar opções melhores pra você 😊'
    };
  }
  
  if (decreaseNoValue.test(lower) && !hasValue) {
    return {
      type: 'decrease',
      hasNewValue: false,
      suggestedQuestion: 'Qual seria o valor máximo ideal pra você? 😊'
    };
  }
  
  return { type: 'none', hasNewValue: hasValue, suggestedQuestion: null };
}

// ========== QUALIFICATION PROGRESS TRACKING ==========

interface QualificationProgress {
  has_region: boolean;
  has_type: boolean;
  has_bedrooms: boolean;
  has_budget: boolean;
  has_purpose: boolean;
}

interface QualificationData {
  detected_neighborhood: string | null;
  detected_property_type: string | null;
  detected_bedrooms: number | null;
  detected_budget_max: number | null;
  detected_interest: string | null;
}

async function getQualificationProgress(supabase: any, phoneNumber: string): Promise<{
  progress: QualificationProgress;
  data: QualificationData | null;
}> {
  try {
    const { data } = await supabase
      .from('lead_qualification')
      .select('detected_neighborhood, detected_property_type, detected_bedrooms, detected_budget_max, detected_interest')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    return {
      progress: {
        has_region: !!data?.detected_neighborhood,
        has_type: !!data?.detected_property_type,
        has_bedrooms: !!data?.detected_bedrooms,
        has_budget: !!data?.detected_budget_max,
        has_purpose: !!data?.detected_interest
      },
      data: data || null
    };
  } catch (error) {
    console.error('❌ Error getting qualification progress:', error);
    return {
      progress: { has_region: false, has_type: false, has_bedrooms: false, has_budget: false, has_purpose: false },
      data: null
    };
  }
}

function getNextQualificationQuestion(progress: QualificationProgress, department: string): string | null {
  // For LOCAÇÃO - order: region → type → bedrooms → budget
  if (department === 'locacao') {
    if (!progress.has_region) return '📍 Qual região de Florianópolis você prefere?';
    if (!progress.has_type) return '🏠 Você busca apartamento, casa ou outro tipo?';
    if (!progress.has_bedrooms) return '🛏️ Quantos quartos você precisa?';
    if (!progress.has_budget) return '💰 Qual sua faixa de valor para o aluguel?';
    return null; // Can search
  }
  
  // For VENDAS - order: purpose → region → type → bedrooms → budget
  if (department === 'vendas') {
    if (!progress.has_purpose) return 'Você está buscando para *morar* ou para *investir*?';
    if (!progress.has_region) return '📍 Qual região de Florianópolis te interessa?';
    if (!progress.has_type) return '🏠 Que tipo de imóvel você busca?';
    if (!progress.has_bedrooms) return '🛏️ Quantos quartos são ideais pra você?';
    if (!progress.has_budget) return '💰 Qual faixa de investimento você considera?';
    return null;
  }
  
  return null;
}

// ========== ANTI-LOOP SYSTEM ==========

function buildContextSummary(qualificationData: QualificationData | null): string {
  if (!qualificationData) return '';
  
  const collected: string[] = [];
  
  if (qualificationData.detected_neighborhood) {
    collected.push(`📍 Região: ${qualificationData.detected_neighborhood}`);
  }
  if (qualificationData.detected_property_type) {
    collected.push(`🏠 Tipo: ${qualificationData.detected_property_type}`);
  }
  if (qualificationData.detected_bedrooms) {
    collected.push(`🛏️ Quartos: ${qualificationData.detected_bedrooms}`);
  }
  if (qualificationData.detected_budget_max) {
    collected.push(`💰 Orçamento: até R$ ${qualificationData.detected_budget_max.toLocaleString('pt-BR')}`);
  }
  if (qualificationData.detected_interest) {
    collected.push(`🎯 Objetivo: ${qualificationData.detected_interest}`);
  }
  
  if (collected.length === 0) return '';
  
  return `
📋 DADOS JÁ COLETADOS (NÃO PERGUNTE DE NOVO):
${collected.join('\n')}
`;
}

function isLoopingQuestion(aiResponse: string, qualificationData: QualificationData | null): boolean {
  if (!qualificationData) return false;
  
  const lower = aiResponse.toLowerCase();
  
  // If already has region and AI asked region again
  if (qualificationData.detected_neighborhood) {
    if (/qual\s+(regi[aã]o|bairro)|onde\s+voc[eê]|localiza[cç][aã]o|prefer[eê]ncia.*regi|que\s+regi/i.test(lower)) {
      console.log('⚠️ Loop detected: asking region again');
      return true;
    }
  }
  
  // If already has bedrooms and AI asked again
  if (qualificationData.detected_bedrooms) {
    if (/quantos?\s+quartos?|n[uú]mero\s+de\s+(quartos?|dormit[oó]rios?)|quantos\s+dormit/i.test(lower)) {
      console.log('⚠️ Loop detected: asking bedrooms again');
      return true;
    }
  }
  
  // If already has budget and AI asked again
  if (qualificationData.detected_budget_max) {
    if (/faixa\s+de\s+(valor|pre[cç]o)|or[cç]amento|quanto\s+(quer|pode)\s+pagar|qual.*valor/i.test(lower)) {
      console.log('⚠️ Loop detected: asking budget again');
      return true;
    }
  }
  
  // If already has property type and AI asked again
  if (qualificationData.detected_property_type) {
    if (/que\s+tipo|qual\s+tipo|tipo\s+de\s+im[oó]vel|apartamento.*casa|busca\s+apartamento/i.test(lower)) {
      console.log('⚠️ Loop detected: asking property type again');
      return true;
    }
  }
  
  // If already has purpose and AI asked again (for vendas)
  if (qualificationData.detected_interest) {
    if (/morar\s+ou\s+investir|para\s+morar|para\s+investir|objetivo|finalidade/i.test(lower)) {
      console.log('⚠️ Loop detected: asking purpose again');
      return true;
    }
  }
  
  return false;
}

async function getConsultativeState(supabase: any, phoneNumber: string): Promise<{
  pending_properties: any[];
  current_property_index: number;
  awaiting_property_feedback: boolean;
} | null> {
  try {
    const { data } = await supabase
      .from('conversation_states')
      .select('pending_properties, current_property_index, awaiting_property_feedback')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('❌ Error getting consultative state:', error);
    return null;
  }
}

async function updateConsultativeState(
  supabase: any, 
  phoneNumber: string, 
  updates: {
    pending_properties?: any[];
    current_property_index?: number;
    awaiting_property_feedback?: boolean;
  }
): Promise<void> {
  try {
    await supabase
      .from('conversation_states')
      .upsert({
        phone_number: phoneNumber,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });
    console.log(`📊 Consultative state updated:`, updates);
  } catch (error) {
    console.error('❌ Error updating consultative state:', error);
  }
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
  
  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hello|hi)$/i.test(cleaned)) {
    return null;
  }
  
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
  
  const words = cleaned.split(/\s+/);
  if (words.length <= 2 && words[0].length >= 2 && words[0].length <= 20) {
    if (/^[A-Za-zÀ-ÿ]+$/.test(words[0])) {
      return words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
    }
  }
  
  return null;
}

const TRIAGE_BUTTON_MAP: Record<string, 'locacao' | 'vendas' | 'administrativo'> = {
  'alugar': 'locacao',
  'comprar': 'vendas',
  'já sou cliente': 'administrativo',
  'ja sou cliente': 'administrativo',
  'setor de locação': 'locacao',
  'setor de locacao': 'locacao',
  'setor de vendas': 'vendas',
  'setor administrativo': 'administrativo',
  'locacao': 'locacao',
  'vendas': 'vendas',
  'administrativo': 'administrativo',
  '1': 'locacao',
  '2': 'vendas',
  '3': 'administrativo'
};

function inferDepartmentFromButton(buttonText?: string, buttonPayload?: string): 'locacao' | 'vendas' | 'administrativo' | null {
  if (buttonText) {
    const normalized = buttonText.toLowerCase().trim();
    if (TRIAGE_BUTTON_MAP[normalized]) {
      console.log(`🔘 Department from button_text: "${buttonText}" → ${TRIAGE_BUTTON_MAP[normalized]}`);
      return TRIAGE_BUTTON_MAP[normalized];
    }
  }
  
  if (buttonPayload) {
    const normalized = buttonPayload.toLowerCase().trim();
    if (TRIAGE_BUTTON_MAP[normalized]) {
      console.log(`🔘 Department from button_payload: "${buttonPayload}" → ${TRIAGE_BUTTON_MAP[normalized]}`);
      return TRIAGE_BUTTON_MAP[normalized];
    }
  }
  
  return null;
}

function inferDepartmentFromText(text: string): 'locacao' | 'vendas' | 'administrativo' | null {
  const lower = text.toLowerCase().trim();
  
  if (TRIAGE_BUTTON_MAP[lower]) return TRIAGE_BUTTON_MAP[lower];
  if (/alug|locar|loca[çc][aã]o|alugo/.test(lower)) return 'locacao';
  if (/compr|adquir|compra|vender|venda/.test(lower)) return 'vendas';
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
    await supabase
      .from('conversations')
      .update({ department_code: department })
      .eq('id', conversationId);
    
    await supabase
      .from('contacts')
      .update({ department_code: department })
      .eq('phone', phoneNumber);
    
    await updateTriageStage(supabase, phoneNumber, 'completed');
    
    console.log(`✅ Department assigned: ${department}`);
  } catch (error) {
    console.error('❌ Error assigning department:', error);
  }
}

// ========== OPENAI INTEGRATION ==========

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

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, department_code')
      .eq('phone', phoneNumber)
      .maybeSingle();

    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({
        phone_number: phoneNumber,
        contact_id: contact?.id || null,
        department_code: departmentCode || contact?.department_code || null,
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
  mediaInfo?: MediaInfo,
  departmentCode?: DepartmentType
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
      department_code: departmentCode || null,
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

    console.log(`💾 ${direction} message saved: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`❌ Error in saveMessage:`, error);
    return null;
  }
}

// ========== AUDIO TRANSCRIPTION & TTS ==========

async function transcribeAudio(supabase: any, audioUrl: string): Promise<string | null> {
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

async function generateAudioResponse(text: string, audioConfig: AudioConfig): Promise<AudioResult | null> {
  if (!audioConfig.audio_enabled) return null;
  
  const textToConvert = text.length > audioConfig.audio_max_chars 
    ? text.substring(0, audioConfig.audio_max_chars) + '...'
    : text;
  
  try {
    console.log('🎙️ Generating TTS audio...');
    
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY not configured');
      return null;
    }

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

    const { data: urlData } = storageSupabase
      .storage
      .from('whatsapp-media')
      .getPublicUrl(fileName);

    console.log('✅ Audio uploaded:', urlData.publicUrl);
    
    return {
      audioUrl: urlData.publicUrl,
      isVoiceMessage: false,
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
      .select(`id, development_id, contact_name, developments!inner(name, slug)`)
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
        console.log(`🏗️ Development detected: "${dev.name}"`);
        return { development_id: dev.id, development_name: dev.name };
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Error detecting development:', error);
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
      if (contactName && !existing.name) {
        await supabase
          .from('contacts')
          .update({ name: contactName })
          .eq('id', existing.id);
      }
    } else {
      await supabase
        .from('contacts')
        .insert({
          phone: phoneNumber,
          name: contactName || null,
          status: 'ativo'
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

    // Load AI Agent Config from database
    const agentConfig = await getAIAgentConfig(supabase);
    const behaviorConfig = await getAIBehaviorConfig(supabase);
    console.log(`🤖 Loaded config: agent_name=${agentConfig.agent_name}, vista=${agentConfig.vista_integration_enabled}`);

    // Parse request body
    const body: MakeWebhookRequest = await req.json();
    
    const { 
      phone, message, contact_name, message_id, timestamp, message_type,
      media_url, media_id, media_mime, media_caption, media_filename,
      button_text, button_payload
    } = body;
    
    if (button_text || button_payload) {
      console.log(`🔘 Button data: text="${button_text}", payload="${button_payload}"`);
    }

    // Skip status callbacks
    if (!phone && !message && !media_url) {
      console.log('📌 Ignoring status callback');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'status_callback' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📥 Make webhook - Phone: ${phone}, Type: ${message_type || 'text'}, Msg: "${message?.substring(0, 50) || '[media/button]'}..."`);

    // Determine message content based on type
    let messageContent = message || '';
    let mediaInfo: MediaInfo | undefined;
    let mediaProcessed: { type: string; transcribed?: boolean; transcription_preview?: string } | undefined;

    const isButton = message_type === 'button';
    const isAudio = message_type === 'audio' || message_type === 'voice';
    const isMedia = ['image', 'video', 'document', 'sticker'].includes(message_type || '');

    if (isButton) {
      messageContent = button_text || button_payload || message || '[Botão clicado]';
      console.log(`🔘 Button message: "${messageContent}"`);
      mediaProcessed = { type: 'button' };
    } else if (isAudio && media_url) {
      console.log(`🎤 Audio message, transcribing...`);
      const transcribedText = await transcribeAudio(supabase, media_url);
      
      if (transcribedText) {
        messageContent = transcribedText;
        mediaProcessed = { type: 'audio', transcribed: true, transcription_preview: transcribedText.substring(0, 100) };
        console.log(`🎤 Transcribed: "${messageContent.substring(0, 50)}..."`);
      } else {
        messageContent = '[Áudio não transcrito - peça para digitar]';
        mediaProcessed = { type: 'audio', transcribed: false };
      }
      
      mediaInfo = { type: 'audio', url: media_url, caption: transcribedText || undefined, mimeType: media_mime };
    } else if (isMedia && media_url) {
      const mediaLabel = message_type === 'image' ? 'Imagem' : message_type === 'video' ? 'Vídeo' : 'Documento';
      messageContent = media_caption || `[${mediaLabel} recebido]`;
      mediaInfo = { type: message_type, url: media_url, caption: media_caption, filename: media_filename, mimeType: media_mime };
      mediaProcessed = { type: message_type || 'unknown' };
    }

    // Validate required fields
    if (!phone || (!message && !media_url && !button_text && !button_payload)) {
      console.warn('⚠️ Incomplete payload');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone number
    const phoneNumber = normalizePhoneNumber(phone);
    console.log(`📱 Normalized phone: ${phoneNumber}`);

    // Create or update contact
    await createOrUpdateContact(supabase, phoneNumber, contact_name);

    // Find or create conversation
    const conversation = await findOrCreateConversation(supabase, phoneNumber);
    const conversationId = conversation?.id || null;
    const currentDepartment = conversation?.department_code;

    // Save inbound message
    await saveMessage(supabase, conversationId, phoneNumber, messageContent, 'inbound', message_id, mediaInfo, currentDepartment);

    // Get conversation history
    const history = conversationId ? await getConversationHistory(supabase, conversationId) : [];
    
    // Build AI prompt message with context
    let aiPromptMessage = messageContent;
    if (isAudio && mediaProcessed?.transcribed) {
      aiPromptMessage = `[Áudio transcrito]: "${messageContent}"`;
    } else if (isMedia) {
      aiPromptMessage = `[${message_type === 'image' ? 'Imagem' : 'Mídia'} recebida${media_caption ? `: "${media_caption}"` : ''}]`;
    }

    // Process property links
    const propertyCode = extractPropertyCodeFromUrl(messageContent);
    let propertyContext = '';
    if (propertyCode) {
      const property = await getPropertyByListingId(supabase, propertyCode);
      if (property) {
        propertyContext = `\n\n[CONTEXTO: Cliente enviou link do imóvel ${propertyCode}:\n${formatPropertyMessage(property)}]`;
        aiPromptMessage += propertyContext;
      }
    }

    // Initialize response variables
    let aiResponse = '';
    let agent = 'helena';
    let developmentDetected: string | null = null;
    let c2sTransferred = false;
    let sendTriageTemplate = false;
    let propertiesToSend: any[] = [];

    // ===== CHECK DEVELOPMENT LEAD =====
    const developmentLead = await checkDevelopmentLead(supabase, phoneNumber);
    const mentionedDevelopment = await detectDevelopmentFromMessage(supabase, messageContent);
    
    const DIRECT_API_DEVELOPMENTS = ['villa maggiore'];
    
    if (developmentLead || mentionedDevelopment) {
      const devInfo = developmentLead || mentionedDevelopment!;
      const devNameLower = (devInfo.development_name || '').toLowerCase();
      
      if (DIRECT_API_DEVELOPMENTS.some(d => devNameLower.includes(d))) {
        console.log(`⛔ Development handled by direct API, skipping`);
        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'handled_by_direct_api' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      developmentDetected = devInfo.development_name;
      console.log(`🏗️ Routing to Helena for: ${developmentDetected}`);

      const development = await getDevelopment(supabase, devInfo.development_id);
      
      if (development) {
        const isFirstMessage = history.length === 0;
        const existingContactName = await getContactName(supabase, phoneNumber);
        const resolvedContactName = existingContactName || developmentLead?.contact_name || contact_name;
        
        const systemPrompt = buildQuickTransferPrompt(development, resolvedContactName, isFirstMessage, history);
        const result = await callOpenAI(systemPrompt, history, aiPromptMessage, toolsQuickTransfer);
        
        aiResponse = result.content;

        // Process tool calls
        for (const toolCall of result.toolCalls) {
          if (toolCall.function.name === 'enviar_lead_c2s') {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`🔧 C2S transfer:`, args);
            
            try {
              await supabase.functions.invoke('c2s-create-lead', {
                body: {
                  name: args.nome || resolvedContactName || 'Lead',
                  phone: phoneNumber,
                  property_type: args.interesse,
                  additional_info: `🚀 LEAD VIA MAKE - ${development.name}\nInteresse: ${args.interesse}\nMotivação: ${args.motivacao || 'N/A'}\nResumo: ${args.resumo}`,
                  development_id: development.id,
                  development_name: development.name,
                }
              });
              c2sTransferred = true;
              console.log('✅ Lead transferred to C2S');
            } catch (error) {
              console.error('❌ Error transferring to C2S:', error);
            }
          }
        }

        if (isFirstMessage) {
          const hasName = !!resolvedContactName && resolvedContactName.toLowerCase() !== 'lead sem nome';
          const greetingMessage = `Que bom seu interesse no ${development.name}! 🏠`;
          const followUpMessage = hasName 
            ? `Prazer, ${resolvedContactName}! 😊 Você está buscando algo para morar ou investir?`
            : 'Pra começar, como posso te chamar?';
          aiResponse = `${greetingMessage}\n\n${followUpMessage}`;
        }
      }
    } else {
      // ===== TRIAGE FLOW FOR NEW LEADS =====
      console.log('🤖 Entering triage flow');
      
      const convState = await getConversationState(supabase, phoneNumber);
      const currentStage = convState?.triage_stage || null;
      const existingName = await getContactName(supabase, phoneNumber);
      
      console.log(`📊 Triage - Stage: ${currentStage}, Name: ${existingName || 'none'}, Dept: ${currentDepartment || 'none'}`);
      
      if (!currentStage || currentStage === 'greeting') {
        const greetingMsg = `Olá! Aqui é a ${agentConfig.agent_name} da ${agentConfig.company_name} 🏠`;
        
        if (existingName) {
          aiResponse = `${greetingMsg}\n\nPrazer em falar com você, ${existingName}! 😊`;
          sendTriageTemplate = true;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
        } else {
          aiResponse = `${greetingMsg}\n\nComo você se chama?`;
          await updateTriageStage(supabase, phoneNumber, 'awaiting_name');
        }
      } else if (currentStage === 'awaiting_name') {
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
        const department = isButton 
          ? inferDepartmentFromButton(button_text, button_payload) || inferDepartmentFromText(messageContent)
          : inferDepartmentFromText(messageContent);
        
        if (department && conversationId) {
          await assignDepartmentMake(supabase, phoneNumber, conversationId, department);
          
          const nameGreeting = existingName ? `, ${existingName}` : '';
          
          if (department === 'locacao') {
            aiResponse = `Ótimo${nameGreeting}! 🏠\n\nVou te ajudar a encontrar o imóvel ideal para alugar em Florianópolis.\n\nPra buscar as melhores opções, me conta:\n📍 Qual região você prefere?`;
          } else if (department === 'vendas') {
            aiResponse = `Excelente${nameGreeting}! 🏡\n\nVou te ajudar a encontrar o imóvel dos seus sonhos.\n\nPra começar: você está buscando para *morar* ou para *investir*?`;
          } else {
            aiResponse = `Perfeito${nameGreeting}! 😊\n\nSou da Smolka e vou te ajudar com sua solicitação.\n\nQual sua demanda?\n📄 Boleto/2ª via\n📝 Contrato\n🔧 Manutenção\n❓ Outra questão`;
          }
          
          console.log(`✅ Department assigned: ${department}`);
        } else {
          sendTriageTemplate = true;
          aiResponse = `Desculpa, não entendi 😅\n\nPor favor, toque em um dos botões:`;
        }
      } else {
        // ===== TRIAGE COMPLETED - USE DEPARTMENT-SPECIFIC PROMPTS =====
        console.log(`🤖 Triage completed, dept: ${currentDepartment}`);
        
        // Check for consultative flow state (awaiting feedback on property)
        const consultativeState = await getConsultativeState(supabase, phoneNumber);
        const isAwaitingFeedback = consultativeState?.awaiting_property_feedback === true;
        const pendingProperties = consultativeState?.pending_properties || [];
        const currentIndex = consultativeState?.current_property_index || 0;
        
        if (isAwaitingFeedback && pendingProperties.length > 0) {
          // Analyze feedback on previously presented property
          const feedback = analyzePropertyFeedback(messageContent);
          console.log(`📊 Property feedback: ${feedback}`);
          
          if (feedback === 'positive') {
            // Client interested - trigger C2S flow
            console.log('✅ Positive feedback - initiating C2S flow');
            const currentProperty = pendingProperties[currentIndex];
            
            // Update state to stop showing more properties
            await updateConsultativeState(supabase, phoneNumber, {
              awaiting_property_feedback: false
            });
            
            // Build context for AI to handle C2S
            const c2sContext = `
[CONTEXTO: Cliente demonstrou interesse no imóvel ${currentProperty?.codigo || 'N/A'} - ${currentProperty?.tipo || ''} em ${currentProperty?.bairro || ''}.
PRÓXIMO PASSO: Confirmar dados do cliente e usar enviar_lead_c2s para transferir.
LEMBRE: Você NÃO agenda visitas. Diga que um consultor vai entrar em contato.]`;
            
            // Get qualification data for context
            const { data: qualData } = await getQualificationProgress(supabase, phoneNumber);
            
            const systemPrompt = currentDepartment === 'locacao' 
              ? buildLocacaoPrompt(agentConfig, existingName || undefined, history, qualData)
              : buildVendasPrompt(agentConfig, existingName || undefined, history, qualData);
            
            const result = await callOpenAI(systemPrompt, history, messageContent + c2sContext, toolsWithVista);
            aiResponse = result.content;
            
            // Process C2S tool call if triggered
            for (const toolCall of result.toolCalls) {
              if (toolCall.function.name === 'enviar_lead_c2s') {
                const args = JSON.parse(toolCall.function.arguments);
                const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
                const c2sResult = await sendLeadToC2S(supabase, args, phoneNumber, historyText, existingName || undefined);
                
                if (c2sResult.success) {
                  c2sTransferred = true;
                  console.log('✅ Lead sent to C2S after positive feedback');
                }
              }
            }
            
          } else if (feedback === 'negative') {
            // ===== PRICE FLEXIBILITY DETECTION =====
            const priceFlexibility = detectPriceFlexibility(messageContent);
            
            if (priceFlexibility.type !== 'none' && !priceFlexibility.hasNewValue) {
              // Client wants to flex price but didn't give value
              console.log(`💰 Price flexibility detected: ${priceFlexibility.type}, asking for value`);
              aiResponse = priceFlexibility.suggestedQuestion!;
              // DON'T show next property - wait for value
            } else {
              // Normal negative feedback - show next property
              console.log('📉 Negative feedback - showing next property');
              
              const nextIndex = currentIndex + 1;
              
              if (nextIndex < pendingProperties.length) {
                // Show next property
                propertiesToSend = [pendingProperties[nextIndex]];
                
                await updateConsultativeState(supabase, phoneNumber, {
                  current_property_index: nextIndex,
                  awaiting_property_feedback: true
                });
                
                const nameGreet = existingName ? `, ${existingName}` : '';
                aiResponse = `Entendi${nameGreet}! 😊 Tenho outra opção que pode ser mais adequada.`;
                
                console.log(`📤 Showing next property: index ${nextIndex}`);
              } else {
                // No more properties
                await updateConsultativeState(supabase, phoneNumber, {
                  awaiting_property_feedback: false,
                  pending_properties: []
                });
                
                aiResponse = `Entendi! Essas eram as opções que encontrei com esses critérios. 🤔\n\nPodemos ajustar a busca? Me conta o que não se encaixou (preço, tamanho, localização).`;
              }
            }
          } else {
            // Neutral feedback - ask for clarification
            const currentProperty = pendingProperties[currentIndex];
            aiResponse = `O que você achou desse imóvel em ${currentProperty?.bairro || 'N/A'}? Faz sentido pra você? 😊`;
          }
        } else {
          // Normal flow - no pending feedback
          
          // ===== LOAD QUALIFICATION DATA FOR CONTEXT =====
          const { progress: qualProgress, data: qualData } = await getQualificationProgress(supabase, phoneNumber);
          console.log(`📊 Qualification progress:`, qualProgress);
          
          let systemPrompt: string;
          let tools = toolsWithVista;
          
          if (currentDepartment === 'locacao') {
            systemPrompt = buildLocacaoPrompt(agentConfig, existingName || undefined, history, qualData);
          } else if (currentDepartment === 'vendas') {
            systemPrompt = buildVendasPrompt(agentConfig, existingName || undefined, history, qualData);
          } else if (currentDepartment === 'administrativo') {
            systemPrompt = buildAdminPrompt(agentConfig, existingName || undefined);
            tools = []; // Admin doesn't need property search
          } else {
            systemPrompt = buildVirtualAgentPrompt(agentConfig, existingName || undefined);
          }
          
          const result = await callOpenAI(systemPrompt, history, aiPromptMessage, tools);
          aiResponse = result.content;
          
          // ===== ANTI-LOOP DETECTION =====
          if (isLoopingQuestion(aiResponse, qualData)) {
            console.log('🔄 Loop detected! Replacing with next qualification question');
            const nextQuestion = getNextQualificationQuestion(qualProgress, currentDepartment || 'locacao');
            if (nextQuestion) {
              aiResponse = nextQuestion;
            } else {
              // Has enough info - can search
              aiResponse = 'Perfeito! Com essas informações, vou buscar as melhores opções pra você 😊';
            }
          }

          // ===== PROCESS TOOL CALLS =====
          for (const toolCall of result.toolCalls) {
            const args = JSON.parse(toolCall.function.arguments);
            console.log(`🔧 Tool call: ${toolCall.function.name}`, args);
            
            if (toolCall.function.name === 'buscar_imoveis') {
              const searchResult = await searchProperties(supabase, args);
              
              if (searchResult.success && searchResult.properties?.length > 0) {
                // CONSULTATIVE FLOW: Save ALL properties, send only FIRST
                const allProperties = searchResult.properties.slice(0, 5);
                
                await updateConsultativeState(supabase, phoneNumber, {
                  pending_properties: allProperties,
                  current_property_index: 0,
                  awaiting_property_feedback: true
                });
                
                // Send only the FIRST property
                propertiesToSend = [allProperties[0]];
                
                // Generate consultive message
                if (!aiResponse || aiResponse.length < 10) {
                  const nameGreet = existingName ? `, ${existingName}` : '';
                  aiResponse = `Encontrei um imóvel que pode combinar com o que você busca${nameGreet}! 🏠`;
                }
                
                console.log(`✅ Consultative flow: saved ${allProperties.length} properties, sending 1`);
              } else {
                if (!aiResponse || aiResponse.length < 10) {
                  aiResponse = `Poxa, não encontrei imóveis com esses critérios 😔 Podemos flexibilizar algo?`;
                }
              }
            }
            
            if (toolCall.function.name === 'enviar_lead_c2s') {
              const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n');
              const c2sResult = await sendLeadToC2S(supabase, args, phoneNumber, historyText, existingName || undefined);
              
              if (c2sResult.success) {
                c2sTransferred = true;
                console.log('✅ Lead sent to C2S');
              }
            }
          }
        }

        // Validate response
        const validation = validateAIResponse(aiResponse);
        if (!validation.valid) {
          aiResponse = FALLBACK_RESPONSE;
        }
      }
    }

    // ===== AUDIO TTS GENERATION =====
    const audioConfig = await getAudioConfig(supabase);
    let audioResult: AudioResult | null = null;

    const userSentVoice = message_type === 'audio' || message_type === 'voice';
    const shouldGenerateAudio = audioConfig?.audio_enabled && aiResponse && userSentVoice;

    if (shouldGenerateAudio) {
      console.log('🎙️ Generating audio response (rapport strategy)');
      audioResult = await generateAudioResponse(aiResponse, audioConfig);
    }

    // Save outbound message
    if (aiResponse && conversationId) {
      await saveMessage(
        supabase, conversationId, phoneNumber, aiResponse, 'outbound',
        undefined,
        audioResult ? { type: 'audio', url: audioResult.audioUrl, mimeType: audioResult.contentType } : undefined,
        currentDepartment
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
        department: currentDepartment,
        properties_found: propertiesToSend.length,
        audio_generated: !!audioResult
      }
    });

    console.log(`✅ Processed - Agent: ${agent}, Dept: ${currentDepartment}, Props: ${propertiesToSend.length}, Audio: ${!!audioResult}`);

    // Get final triage stage and consultative state
    const finalState = await getConversationState(supabase, phoneNumber);
    const finalConsultativeState = await getConsultativeState(supabase, phoneNumber);
    
    // Build presentation state for Make.com
    const presentationState = finalConsultativeState?.awaiting_property_feedback ? {
      awaiting_feedback: true,
      current_index: finalConsultativeState.current_property_index || 0,
      total_found: (finalConsultativeState.pending_properties || []).length,
      property_code: propertiesToSend[0]?.codigo || null
    } : null;
    
    return new Response(
      JSON.stringify({
        success: true,
        result: aiResponse,
        phone: phoneNumber,
        agent,
        conversation_id: conversationId,
        department: currentDepartment,
        // Properties found for Make to send (1 at a time in consultative flow)
        properties: propertiesToSend.length > 0 ? propertiesToSend.map(p => ({
          codigo: p.codigo,
          foto_destaque: p.foto_destaque,
          tipo: p.tipo,
          bairro: p.bairro,
          quartos: p.quartos,
          preco_formatado: p.preco_formatado,
          link: p.link,
          area_util: p.area_util,
          vagas: p.vagas,
          valor_condominio: p.valor_condominio
        })) : undefined,
        // Consultative presentation state
        presentation_state: presentationState,
        // Template to send
        send_template: sendTriageTemplate ? { name: 'triagem', language: 'pt_BR' } : null,
        // Audio for Make to send
        audio: audioResult ? {
          url: audioResult.audioUrl,
          type: audioResult.contentType,
          is_voice_message: audioResult.isVoiceMessage
        } : null,
        // C2S transfer status
        c2s_transferred: c2sTransferred,
        metadata: {
          development_detected: developmentDetected,
          media_processed: mediaProcessed || null,
          audio_enabled: audioConfig?.audio_enabled || false,
          triage_stage: finalState?.triage_stage || null,
          consultative_flow: !!presentationState
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
        result: 'Desculpe, tive um problema técnico. Pode tentar novamente?'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
