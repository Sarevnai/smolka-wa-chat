import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ========== MAPEAMENTO ESTRUTURADO DE REGIÕES DE FLORIANÓPOLIS ==========
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

// Get all neighborhoods as a flat list
function getAllNeighborhoods(): string[] {
  const all: string[] = [];
  for (const region of Object.values(FLORIANOPOLIS_REGIONS)) {
    all.push(...region.bairros);
  }
  return all;
}

// Find which region a neighborhood belongs to
function findRegionByNeighborhood(bairro: string): { regionKey: string; regionName: string } | null {
  const normalizedBairro = bairro.toLowerCase().trim();
  
  for (const [key, region] of Object.entries(FLORIANOPOLIS_REGIONS)) {
    for (const b of region.bairros) {
      if (b.toLowerCase() === normalizedBairro) {
        return { regionKey: key, regionName: region.nome };
      }
    }
  }
  return null;
}

// Get all neighborhoods in a region
function getNeighborhoodsByRegion(regiao: string): string[] {
  const normalizedRegiao = regiao.toLowerCase().trim()
    .replace(/^região\s+/, '')
    .replace(/^regiao\s+/, '');
  
  const region = FLORIANOPOLIS_REGIONS[normalizedRegiao];
  return region ? region.bairros : [];
}

// Calculate similarity between two strings (Levenshtein distance based)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1;
  
  // Simple Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
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
  
  const distance = matrix[len1][len2];
  return 1 - distance / maxLen;
}

// Normalize neighborhood name (fix typos)
function normalizeNeighborhood(input: string): { normalized: string; confidence: number; original: string } {
  const trimmed = input.trim();
  const allNeighborhoods = getAllNeighborhoods();
  
  // Check for exact match first (case insensitive)
  const exactMatch = allNeighborhoods.find(n => n.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) {
    return { normalized: exactMatch, confidence: 1.0, original: trimmed };
  }
  
  // Check for partial matches (e.g., "Ingleses" matches "Ingleses do Rio Vermelho")
  const partialMatch = allNeighborhoods.find(n => 
    n.toLowerCase().startsWith(trimmed.toLowerCase()) ||
    trimmed.toLowerCase().startsWith(n.toLowerCase())
  );
  if (partialMatch) {
    return { normalized: partialMatch, confidence: 0.95, original: trimmed };
  }
  
  // Find best match using similarity
  let bestMatch = trimmed;
  let bestScore = 0;
  
  for (const neighborhood of allNeighborhoods) {
    const similarity = stringSimilarity(trimmed, neighborhood);
    if (similarity > bestScore && similarity >= 0.6) {
      bestScore = similarity;
      bestMatch = neighborhood;
    }
  }
  
  return { 
    normalized: bestMatch, 
    confidence: bestScore,
    original: trimmed 
  };
}

// Check if input is a region name
function isRegionName(input: string): boolean {
  const normalized = input.toLowerCase().trim()
    .replace(/^região\s+/, '')
    .replace(/^regiao\s+/, '');
  
  return Object.keys(FLORIANOPOLIS_REGIONS).includes(normalized);
}

// Expand region to neighborhoods or return single neighborhood
function expandRegionToNeighborhoods(input: string): { 
  isRegion: boolean;
  neighborhoods: string[];
  regionName?: string;
  suggestion?: string;
} {
  const normalized = input.toLowerCase().trim()
    .replace(/^região\s+/, '')
    .replace(/^regiao\s+/, '');
  
  // Check if it's a region
  if (FLORIANOPOLIS_REGIONS[normalized]) {
    const region = FLORIANOPOLIS_REGIONS[normalized];
    return {
      isRegion: true,
      neighborhoods: region.bairros,
      regionName: region.nome,
      suggestion: `A ${region.nome} tem ótimas opções! Posso sugerir: ${region.bairros.slice(0, 4).join(', ')}... Tem preferência por algum desses?`
    };
  }
  
  // Try to normalize as a neighborhood
  const result = normalizeNeighborhood(input);
  
  // If confidence is low, might be a typo - suggest correction
  if (result.confidence < 0.8 && result.confidence > 0.5) {
    return {
      isRegion: false,
      neighborhoods: [result.normalized],
      suggestion: `Você quis dizer ${result.normalized}?`
    };
  }
  
  return {
    isRegion: false,
    neighborhoods: [result.normalized]
  };
}

// Generate region knowledge for AI prompt
function generateRegionKnowledge(): string {
  const lines: string[] = [
    '\n📍 CONHECIMENTO LOCAL DE FLORIANÓPOLIS (USE SEMPRE):',
    ''
  ];
  
  for (const [key, region] of Object.entries(FLORIANOPOLIS_REGIONS)) {
    lines.push(`${region.nome.toUpperCase()}: ${region.bairros.slice(0, 8).join(', ')}${region.bairros.length > 8 ? '...' : ''}`);
  }
  
  lines.push('');
  lines.push('⚡ QUANDO O CLIENTE MENCIONAR UMA REGIÃO:');
  lines.push('- Se disser "norte" ou "região norte" → Pergunte: "A região norte tem várias praias! Ingleses, Canasvieiras, Jurerê... Tem alguma preferência?"');
  lines.push('- Se disser "sul" → Pergunte: "O sul tem o Campeche, Armação, Ribeirão da Ilha... Qual desses te interessa mais?"');
  lines.push('- Se disser "leste" ou "lagoa" → Pergunte: "A Lagoa da Conceição é incrível! Prefere mais perto da praia ou da vila?"');
  lines.push('- Se disser "centro" → Pergunte: "No centro, temos Trindade, Agronômica, Itacorubi... Qual região te agrada?"');
  lines.push('- Se disser "continente" → Pergunte: "No continente, Estreito e Coqueiros são muito procurados. Tem preferência?"');
  lines.push('');
  lines.push('⚡ CORREÇÃO DE ERROS DE DIGITAÇÃO:');
  lines.push('- Se o bairro parecer errado, confirme educadamente: "Você quis dizer [bairro correto]?"');
  lines.push('- Exemplos: "Tridade" → "Trindade", "Ingleseis" → "Ingleses", "Canasvieras" → "Canasvieiras"');
  
  return lines.join('\n');
}

// ========== PROPERTY LINK EXTRACTION ==========

/**
 * Extract property code from URLs sent by customers
 * Supports smolkaimoveis.com.br links and various Vista patterns
 * 
 * URL pattern examples:
 * - smolkaimoveis.com.br/imovel/casas-jurere-internacional-florianopolis-sc-3-quartos-412.8m2-7558
 *   → Code is 7558 (at the END, after the last dash)
 * - smolkaimoveis.com.br/imovel/apartamento-ingleses-1234
 *   → Code is 1234
 */
function extractPropertyCodeFromUrl(message: string): string | null {
  if (!message) return null;
  
  // First, try to find Smolka URLs and extract the LAST number (the property code)
  const smolkaUrlMatch = message.match(/smolkaimoveis\.com\.br\/imovel\/([^\s]+)/i);
  if (smolkaUrlMatch && smolkaUrlMatch[1]) {
    const urlPath = smolkaUrlMatch[1];
    // The property code is always the LAST sequence of 3-6 digits in the URL path
    // We need to find all digit sequences and get the last one
    const allNumbers = urlPath.match(/\d+/g);
    if (allNumbers && allNumbers.length > 0) {
      // Get the last number in the URL - this is typically the property code
      const lastNumber = allNumbers[allNumbers.length - 1];
      // Property codes are usually 3-6 digits
      if (lastNumber.length >= 3 && lastNumber.length <= 6) {
        console.log(`🔗 Property code extracted from Smolka URL: ${lastNumber} (last number in path)`);
        return lastNumber;
      }
    }
  }
  
  // Fallback patterns for other URL formats
  const fallbackPatterns = [
    // vistasoft URLs with codigo parameter
    /codigo[=\/](\d{3,6})\b/i,
    // Direct property code in URL
    /\/imovel\/(\d{3,6})(?:\s|$|\/|\?)/i
  ];
  
  for (const pattern of fallbackPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      console.log(`🔗 Property code extracted: ${match[1]} from fallback pattern: ${pattern}`);
      return match[1];
    }
  }
  
  return null;
}

/**
 * Extract property info from URL text (bairro, tipo) when we can't get the code
 */
function extractInfoFromUrlText(message: string): { tipo?: string; bairro?: string } {
  const result: { tipo?: string; bairro?: string } = {};
  
  const urlMatch = message.match(/smolkaimoveis\.com\.br\/imovel\/([^\s]+)/i);
  if (urlMatch && urlMatch[1]) {
    const urlPath = urlMatch[1].toLowerCase();
    
    // Extract property type
    if (urlPath.includes('apartamento')) result.tipo = 'apartamento';
    else if (urlPath.includes('casa')) result.tipo = 'casa';
    else if (urlPath.includes('cobertura')) result.tipo = 'cobertura';
    else if (urlPath.includes('terreno')) result.tipo = 'terreno';
    else if (urlPath.includes('kitnet')) result.tipo = 'kitnet';
    else if (urlPath.includes('comercial') || urlPath.includes('sala')) result.tipo = 'comercial';
    
    // Try to extract neighborhood from URL
    const neighborhoods = getAllNeighborhoods();
    for (const n of neighborhoods) {
      const normalizedNeighborhood = n.toLowerCase()
        .replace(/\s+/g, '-')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      if (urlPath.includes(normalizedNeighborhood) || urlPath.includes(n.toLowerCase().replace(/\s+/g, '-'))) {
        result.bairro = n;
        break;
      }
    }
  }
  
  return result;
}

/**
 * Check if message references a previously sent property
 */
function referencesEarlierProperty(message: string): boolean {
  return /primeiro|aquele|esse|anterior|que\s+(te\s+)?mandei|que\s+enviei|imóvel\s+do\s+link|imóvel\s+que\s+(te\s+)?mostrei/i.test(message);
}

/**
 * Check if message contains a property URL
 */
function containsPropertyUrl(message: string): boolean {
  return /smolkaimoveis\.com\.br\/imovel\//i.test(message) ||
         /vistasoft.*imovel/i.test(message) ||
         /imovel.*codigo[=\/]\d+/i.test(message);
}

type AIProvider = 'lovable' | 'openai';

interface Objection {
  objection: string;
  response: string;
}

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
  ai_provider: AIProvider;
  ai_model: string;
  max_tokens: number;
  max_history_messages: number;
  // Humanization settings
  humanize_responses: boolean;
  fragment_long_messages: boolean;
  message_delay_ms: number;
  emoji_intensity: 'none' | 'low' | 'medium';
  use_customer_name: boolean;
  // Audio settings
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_channel_mirroring: boolean;
  audio_max_chars: number;
  // Business Context
  target_audience: string;
  competitive_advantages: string[];
  company_values: string;
  service_areas: string[];
  // Rapport Techniques
  rapport_enabled: boolean;
  rapport_use_name: boolean;
  rapport_mirror_language: boolean;
  rapport_show_empathy: boolean;
  rapport_validate_emotions: boolean;
  // Mental Triggers
  triggers_enabled: boolean;
  trigger_urgency: boolean;
  trigger_scarcity: boolean;
  trigger_social_proof: boolean;
  trigger_authority: boolean;
  social_proof_text: string;
  authority_text: string;
  // Objections
  objections: Objection[];
  // Knowledge Base
  knowledge_base_url: string;
  knowledge_base_content: string;
  knowledge_base_last_update: string;
  // SPIN Qualification
  spin_enabled: boolean;
  spin_situation_questions: string[];
  spin_problem_questions: string[];
  spin_implication_questions: string[];
  spin_need_questions: string[];
  escalation_criteria: string[];
  // Vista CRM Integration
  vista_integration_enabled: boolean;
}

const defaultConfig: AIAgentConfig = {
  agent_name: 'Assistente Virtual',
  company_name: 'Smolka Imóveis',
  company_description: 'Administradora de imóveis especializada em locação e gestão de propriedades.',
  services: ['Locação de imóveis', 'Gestão de propriedades', 'Administração de condomínios'],
  tone: 'formal',
  limitations: [],
  faqs: [],
  custom_instructions: '',
  greeting_message: 'Olá! Sou o assistente virtual da {company_name}. Como posso ajudá-lo?',
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
  // Business Context defaults
  target_audience: '',
  competitive_advantages: [],
  company_values: '',
  service_areas: [],
  // Rapport defaults
  rapport_enabled: true,
  rapport_use_name: true,
  rapport_mirror_language: true,
  rapport_show_empathy: true,
  rapport_validate_emotions: true,
  // Trigger defaults
  triggers_enabled: true,
  trigger_urgency: true,
  trigger_scarcity: true,
  trigger_social_proof: true,
  trigger_authority: true,
  social_proof_text: '',
  authority_text: '',
  // Objections defaults
  objections: [],
  // Knowledge Base defaults
  knowledge_base_url: '',
  knowledge_base_content: '',
  knowledge_base_last_update: '',
  // SPIN defaults
  spin_enabled: true,
  spin_situation_questions: [],
  spin_problem_questions: [],
  spin_implication_questions: [],
  spin_need_questions: [],
  escalation_criteria: [],
  // Vista CRM
  vista_integration_enabled: true,
};

const toneDescriptions: Record<string, string> = {
  formal: 'Formal e profissional',
  casual: 'Casual e descontraído',
  friendly: 'Amigável e acolhedor',
  technical: 'Técnico e preciso'
};

// Emoji variations by context
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

// Humanization phrases
const humanPhrases = {
  thinking: ['Deixa eu verificar...', 'Um momento...', 'Vou conferir isso...', 'Só um instante...'],
  agreement: ['Entendi!', 'Certo!', 'Perfeito!', 'Compreendi!', 'Claro!'],
  transition: ['Olha só,', 'Então,', 'Bom,', 'Veja bem,', 'Pois é,'],
  empathy: ['Entendo sua situação.', 'Compreendo.', 'Faz sentido.', 'Imagino como deve ser.'],
};

function getRandomPhrase(type: keyof typeof humanPhrases): string {
  const phrases = humanPhrases[type];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// Extract customer name from message using regex patterns
function extractCustomerName(message: string): string | null {
  const patterns = [
    // "Sou o/a João", "Sou João"
    /(?:sou\s+(?:o|a)?\s*)([A-Za-zÀ-ÿ]{2,})/i,
    // "Me chamo Maria"
    /(?:me\s+chamo?\s*)([A-Za-zÀ-ÿ]{2,})/i,
    // "Meu nome é Pedro"
    /(?:meu\s+nome\s+[eé]\s*)([A-Za-zÀ-ÿ]{2,})/i,
    // "Pode me chamar de Ana"
    /(?:pode\s+me\s+chamar\s+de?\s*)([A-Za-zÀ-ÿ]{2,})/i,
    // "É Carlos" / "Eh Carlos"
    /^(?:[eé]h?\s+)([A-Za-zÀ-ÿ]{2,})$/i,
    // Resposta direta curta: "João" ou "Maria" (apenas 1-2 palavras)
    /^([A-Za-zÀ-ÿ]{2,}(?:\s+[A-Za-zÀ-ÿ]{2,})?)$/,
  ];
  
  // Invalid names - common words that are not names
  const invalidNames = [
    'sim', 'não', 'nao', 'ok', 'oi', 'olá', 'ola', 'bom', 'boa', 'dia', 'tarde', 'noite',
    'obrigado', 'obrigada', 'tchau', 'até', 'ate', 'valeu', 'blz', 'beleza',
    'quero', 'preciso', 'tenho', 'busco', 'procuro', 'apartamento', 'casa', 'imovel', 'imóvel',
    'alugar', 'comprar', 'vender', 'aluguel', 'venda', 'locação', 'locacao',
    'centro', 'trindade', 'ingleses', 'campeche', 'lagoa', 'floripa', 'florianópolis',
    'texto', 'áudio', 'audio', 'mensagem', 'foto', 'imagem'
  ];
  
  for (const pattern of patterns) {
    const match = message.trim().match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Validate: not a common word and has minimum length
      if (!invalidNames.includes(name.toLowerCase()) && name.length >= 2 && name.length <= 30) {
        // Capitalize first letter of each word
        return name.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
      }
    }
  }
  return null;
}

// Check if assistant asked for customer name
function didAskForName(message: string): boolean {
  const askNamePatterns = [
    /como\s+(?:posso\s+)?(?:te\s+)?chamar/i,
    /qual\s+(?:é\s+)?(?:o\s+)?(?:seu\s+)?nome/i,
    /como\s+(?:é\s+)?(?:o\s+)?(?:seu\s+)?nome/i,
    /me\s+(?:diz|diga)\s+(?:o\s+)?(?:seu\s+)?nome/i,
  ];
  return askNamePatterns.some(pattern => pattern.test(message));
}

// Tool definitions for OpenAI function calling
const tools = [
  {
    type: "function",
    function: {
      name: "buscar_imoveis",
      description: "Busca imóveis no catálogo da Smolka Imóveis. IMPORTANTE: Se o cliente usar palavras como 'alugar', 'aluguel', 'locação' ou 'alugo', defina finalidade='locacao'. Se mencionar 'comprar', 'compra' ou 'venda', defina finalidade='venda'. Sempre pergunte se não ficar claro.",
      parameters: {
        type: "object",
        properties: {
          tipo: {
            type: "string",
            description: "Tipo do imóvel: apartamento, casa, terreno, comercial, cobertura, kitnet, sobrado",
            enum: ["apartamento", "casa", "terreno", "comercial", "cobertura", "kitnet", "sobrado", "sala"]
          },
          bairro: {
            type: "string",
            description: "Nome do bairro de Florianópolis. Se o cliente mencionar uma REGIÃO (norte, sul, leste, centro, continente), peça para especificar um bairro antes de buscar. Bairros válidos incluem: Ingleses, Canasvieiras, Jurerê, Campeche, Lagoa da Conceição, Centro, Trindade, Itacorubi, Estreito, Coqueiros, etc."
          },
          cidade: {
            type: "string",
            description: "Nome da cidade (padrão: Florianópolis)"
          },
          preco_min: {
            type: "number",
            description: "Valor mínimo em reais. Para aluguel use valor mensal (ex: 3000 para R$ 3.000/mês). Para venda use valor total (ex: 500000 para R$ 500.000)"
          },
          preco_max: {
            type: "number",
            description: "Valor máximo em reais. Para aluguel use valor mensal (ex: 8000 para R$ 8.000/mês). Para venda use valor total (ex: 800000)"
          },
          quartos: {
            type: "number",
            description: "Número EXATO de dormitórios desejados pelo cliente"
          },
          finalidade: {
            type: "string",
            description: "OBRIGATÓRIO. Use 'locacao' para aluguel/alugar/locação. Use 'venda' para comprar/compra/aquisição",
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
      description: "IMPORTANTE: Use esta função SOMENTE quando finalidade=venda (COMPRA de imóvel). Envia o lead qualificado para o sistema C2S dos corretores especializados em vendas. Use APÓS coletar tipo, bairro e faixa de preço do cliente que quer COMPRAR.",
      parameters: {
        type: "object",
        properties: {
          nome: {
            type: "string",
            description: "Nome do cliente (se souber)"
          },
          interesse: {
            type: "string",
            description: "Descrição do interesse do cliente (ex: 'Apartamento 3 quartos no Centro até 800mil')"
          },
          tipo_imovel: {
            type: "string",
            description: "Tipo de imóvel desejado"
          },
          bairro: {
            type: "string",
            description: "Bairro de interesse"
          },
          faixa_preco: {
            type: "string",
            description: "Faixa de preço informada pelo cliente"
          },
          quartos: {
            type: "number",
            description: "Número de quartos desejados"
          }
        },
        required: ["interesse"]
      }
    }
  }
];

// Validate AI response for forbidden content (competitors, generic advice)
const FORBIDDEN_RESPONSE_PATTERNS = [
  /quintoandar/i,
  /vivareal/i,
  /zap\s*im[oó]veis/i,
  /olx/i,
  /imovelweb/i,
  /outras?\s*imobili[aá]rias?/i,
  /copie?\s*(e|para)\s*(adapte|enviar|mandar)/i,
  /mensagem\s+(para|pra)\s+(você\s+)?(usar|enviar|mandar)/i,
  /texto\s+(para|pra)\s+enviar/i,
  /passo\s+a\s+passo/i,
  /filtros?\s+(nos?|em)\s+sites?/i,
  /apps?\s+como/i,
  /na\s+visita[,:]?\s*(para|você)/i,
  /o\s+que\s+perguntar\s+ao?\s+propriet[aá]rio/i,
  /pontos?\s+importantes?\s+em\s+im[oó]veis?/i,
  /cidade\s*\/\s*estado/i,
  /qual\s+(cidade|estado)/i,
  /valores?\s+no\s+centro/i,
  /estimativa\s+de\s+valor/i,
  /vi\s+o\s+an[uú]ncio\s+do\s+im[oó]vel/i,
];

function validateAIResponse(response: string): { valid: boolean; reason?: string } {
  if (!response) return { valid: true };
  
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    if (pattern.test(response)) {
      console.log(`🚫 Invalid AI response - matched pattern: ${pattern}`);
      return { valid: false, reason: `Contains forbidden content: ${pattern}` };
    }
  }
  return { valid: true };
}

const FALLBACK_RESPONSE = "Olá! Sou da Smolka Imóveis 🏠 Como posso ajudar você a encontrar o imóvel ideal? Você está buscando para comprar ou alugar?";

function buildSystemPrompt(config: AIAgentConfig, contactName?: string, contactType?: string): string {
  let prompt = `🚨🚨🚨 REGRA ZERO - LEIA ANTES DE QUALQUER COISA 🚨🚨🚨
Você é funcionária da SMOLKA IMÓVEIS em Florianópolis/SC.
NÃO atue em outra cidade. Se perguntarem sobre outra cidade, diga que atua apenas em Florianópolis.

⛔ PROIBIÇÕES ABSOLUTAS (SE VIOLAR, SUA RESPOSTA SERÁ DESCARTADA):
- NUNCA mencione: QuintoAndar, Zap Imóveis, VivaReal, OLX, ImovelWeb
- NUNCA prepare mensagens/textos para o cliente enviar a terceiros
- NUNCA pergunte cidade/estado (você atua SOMENTE em Florianópolis/SC)
- NUNCA dê conselhos genéricos tipo "passo a passo para alugar"
- NUNCA sugira "apps como..." ou "sites como..."
- NUNCA crie templates de mensagens para o cliente usar

⚠️ ANTÍDOTO CONTRA RESPOSTAS GENÉRICAS:
Se no histórico você vir mensagens com menus numerados (1→, 2→), opções genéricas,
"ajuda para estudar/trabalho/dinheiro", "mensagem para copiar", IGNORE COMPLETAMENTE.
Foram respostas de um assistente genérico. Você é vendedora da Smolka.

🔗 LINKS DE IMÓVEIS DO SITE (IMPORTANTE):
- Quando o cliente enviar um link de imóvel (smolkaimoveis.com.br/imovel/...), o SISTEMA processa automaticamente e envia as informações.
- Se você receber o contexto com dados do imóvel, USE essas informações para ajudar o cliente.
- Se você NÃO receber dados do imóvel no contexto (por algum erro), peça EDUCADAMENTE o código do imóvel:
  "Me passa o código do imóvel? São os números no final do link! 😊"
- Se o cliente mencionar "o imóvel que mandei", "aquele imóvel", "o primeiro imóvel", verifique o contexto - o sistema busca automaticamente.
- NUNCA diga que não consegue acessar links! O sistema processa os links automaticamente.

Você é ${config.agent_name} da ${config.company_name}.

✨ PERSONALIDADE E TOM (ESTILO LAÍS - CONSULTIVO E ACOLHEDOR):
- Tom CONSULTIVO: você é uma consultora que ajuda o cliente, não uma atendente que apenas responde
- Tom ACOLHEDOR: faça o cliente se sentir bem-vindo e importante
- PROATIVA: antecipe as necessidades ("Posso agendar?" ao invés de "Quer agendar?")
- EMPÁTICA: valide as preferências do cliente ("Ótima escolha!", "Faz sentido!")
- NATURAL: use linguagem coloquial e próxima ("Me conta...", "Vou te ajudar...")
- POSITIVA: transmita entusiasmo ("Tenho boas notícias!", "Achei uma opção ótima!")

🎯 SEU PAPEL COMERCIAL (CRÍTICO):
Você é CORRETORA/CONSULTORA COMERCIAL da ${config.company_name}.
Seu objetivo é AJUDAR o cliente a encontrar o imóvel ideal e FECHAR negócios.
Você NÃO é assistente genérica. Você é consultora especializada da Smolka.

SOBRE A EMPRESA:
${config.company_description}`;

  // ========== FLUXO DE 5 ETAPAS (ESTILO LAÍS) ==========
  prompt += `

📍📍📍 FLUXO DE ATENDIMENTO EM 5 ETAPAS - ESTILO LAÍS (SIGA RIGOROSAMENTE) 📍📍📍

📍 ETAPA 1 - SAUDAÇÃO INICIAL (primeira mensagem do cliente)
Responda com saudação CURTA e ACOLHEDORA:
• Seu nome e empresa
• Pergunte o que o cliente busca de forma ABERTA
• Mencione áudio de forma sutil como uma opção para o cliente

Exemplo:
"Oi! Aqui é a ${config.agent_name} da Smolka 🏠
Me conta, o que você tá buscando? Se preferir, pode me mandar áudio 😊"

📱 QUANDO O CLIENTE PERGUNTAR SE PODE MANDAR ÁUDIO:
Responda de forma BREVE e NATURAL, como uma pessoa real:
✅ "Claro, pode sim!"
✅ "Pode mandar, se for melhor pra você!"
✅ "Claro que pode! 😊"
❌ NUNCA diga: "Pode mandar áudio que eu entendo direitinho!"
❌ NUNCA diga: "Eu entendo texto e áudio!"
❌ NUNCA diga: "Pode me mandar texto ou áudio, eu entendo os dois!"

📍 ETAPA 2 - QUALIFICAÇÃO NATURAL (ESTILO CONSULTIVO)
Capture as informações de forma NATURAL e FLUIDA, não como um formulário:

❌ ERRADO (robótico): "Qual o tipo? Qual o bairro? Qual o preço?"
✅ CERTO (consultivo): "Me conta um pouquinho, o que você procura?"

Fluxo natural de perguntas:
1. "Me conta, o que você tá buscando?" → descobre finalidade + tipo
2. "E qual região de Floripa te interessa?" → descobre bairro
3. "Quantos quartos você precisa?" → descobre quartos
4. "E qual valor você pretende pagar por mês?" → descobre preço

💡 DICA: Se o cliente já informou algo, não pergunte de novo! Avance para a próxima informação.

⚠️ REGRA CRÍTICA: NÃO chame buscar_imoveis até ter TIPO + BAIRRO + PREÇO!
Se o cliente não informou o preço, PERGUNTE antes de buscar.`;

  // Instrução de captura de nome
  if (!contactName && config.rapport_use_name) {
    prompt += `

⭐ CAPTURA DE NOME (IMPORTANTE PARA RAPPORT):
- Você ainda NÃO sabe o nome deste cliente
- Na SEGUNDA ou TERCEIRA mensagem, pergunte naturalmente: "A propósito, como posso te chamar?"
- Quando o cliente responder o nome, USE-O nas próximas mensagens
- Responda com: "Prazer, [Nome]! ..." para confirmar que anotou`;
  }

  if (contactName && config.rapport_use_name) {
    prompt += `

👤 CLIENTE ATUAL: ${contactName}
- Use o nome "${contactName}" naturalmente nas interações (1-2x por resposta)
- Exemplo: "Entendi, ${contactName}!" ou "Perfeito, ${contactName}!"
- Não exagere no uso do nome, seja natural`;
  }

  prompt += `

⚠️ REGRA CRÍTICA: SÓ chame buscar_imoveis quando tiver TIPO + BAIRRO + FAIXA DE PREÇO!
Se o cliente não informou quanto quer pagar, pergunte ANTES de buscar.
Exemplo: "E qual valor você pretende pagar por mês?"

📍 ETAPA 3 - BUSCA E APRESENTAÇÃO (ESTILO LAÍS)
Quando encontrar imóveis:
1. Envie uma frase EMPOLGANTE e CURTA: "Achei uma opção ótima pra você${contactName ? `, ${contactName}` : ''}! 🎉"
2. O SISTEMA envia foto + características automaticamente
3. Depois pergunte DE FORMA CONSULTIVA: "Faz sentido pra você? 😊"

Se não encontrar:
- "Poxa, não encontrei exatamente com esses critérios 😔 Mas posso ajustar a busca! Me conta, o que podemos flexibilizar?"

📍 ETAPA 4 - FOLLOW-UP (ESTILO CONSULTIVO)
Se cliente GOSTOU:
- "Ótimo${contactName ? `, ${contactName}` : ''}! 🎉 Posso agendar uma visita pra você conhecer pessoalmente?"

Se cliente NÃO gostou:
- "Entendi! Me conta o que não te agradou, assim posso te mostrar algo mais alinhado 😊"

Se cliente quer OUTRA OPÇÃO:
- "Claro! Tenho outras opções, vou te mostrar mais uma..."

Se cliente tem DÚVIDA:
- Responda a dúvida de forma clara e objetiva
- Depois: "Ficou alguma outra dúvida? Posso agendar uma visita pra você ver de perto! 😊"

📍 ETAPA 5 - AGENDAMENTO COMPLETO (ESTILO LAÍS)
Siga TODOS estes passos:

1️⃣ PERGUNTAR DISPONIBILIDADE (proativo):
- "Qual dia seria melhor pra você conhecer o imóvel?"

2️⃣ CONFIRMAR HORÁRIO:
- "Perfeito! Manhã ou tarde?"

3️⃣ CONFIRMAR DADOS:
- "Posso confirmar seu telefone pra nossa equipe entrar em contato?"

4️⃣ ENVIAR LOCALIZAÇÃO (informar que vai enviar):
- "Vou te mandar a localização do imóvel! 📍"

5️⃣ REFORÇAR COMPROMISSO:
- "Anotei aqui: ${contactName || 'você'}, visita no [dia] às [horário]. Vou te lembrar no dia, tá? 😊"

6️⃣ FINALIZAR COM ENTUSIASMO:
- "Mal posso esperar pra você conhecer! Até lá! 🙌"

📝 EXEMPLO DE CONVERSA IDEAL (ESTILO LAÍS):

CLIENTE: Oi
AGENTE: Oi! Aqui é a [NOME_AGENTE] da [EMPRESA] 🏠 Me conta, o que você tá buscando? Se preferir, pode me mandar áudio 😊

CLIENTE: Quero alugar um apartamento
AGENTE: Legal! 🎉 A propósito, como posso te chamar?

CLIENTE: Marcos
AGENTE: Prazer, Marcos! 😊 E qual região de Floripa seria ideal pra você?

CLIENTE: Centro ou Trindade
AGENTE: Ótimas regiões! Quantos quartos você precisa?

CLIENTE: 2 quartos
AGENTE: Perfeito! E qual valor você pretende pagar por mês?

CLIENTE: Até 3 mil
[AGENTE CHAMA buscar_imoveis]
AGENTE: Achei uma opção ótima pra você, Marcos! 🎉
[SISTEMA ENVIA FOTO E CARACTERÍSTICAS]
AGENTE: Faz sentido pra você? 😊

CLIENTE: Gostei muito!
AGENTE: Ótimo, Marcos! 🎉 Posso agendar uma visita pra você conhecer pessoalmente?

CLIENTE: Quero sim!
AGENTE: Qual dia seria melhor pra você?

CLIENTE: Sábado
AGENTE: Perfeito! Manhã ou tarde?

CLIENTE: Tarde
AGENTE: Show! Vou anotar: Marcos, visita no sábado à tarde. Vou te mandar a localização! 📍 Em breve nossa equipe confirma o horário exato com você. Mal posso esperar pra você conhecer o imóvel! 🙌

GATILHOS DE TRANSIÇÃO DE ETAPA:
• Etapa 1 → 2: Cliente respondeu ou iniciou conversa
• Etapa 2 → 3: Tem finalidade + tipo + bairro + preço → BUSCAR IMÓVEIS
• Etapa 3 → 4: Imóvel foi apresentado
• Etapa 4 → 5: Cliente demonstrou interesse ("gostei", "quero ver", "interessante", "pode agendar")
• Etapa 5 → Fim: Visita agendada (dados coletados)`;

  // Business Context
  if (config.target_audience) {
    prompt += `\n\nPÚBLICO-ALVO:\n${config.target_audience}`;
  }

  if (config.competitive_advantages && config.competitive_advantages.length > 0) {
    prompt += `\n\nDIFERENCIAIS COMPETITIVOS:
${config.competitive_advantages.map(a => `• ${a}`).join('\n')}`;
  }

  if (config.company_values) {
    prompt += `\n\nVALORES DA EMPRESA:\n${config.company_values}`;
  }

  if (config.service_areas && config.service_areas.length > 0) {
    prompt += `\n\nREGIÕES DE ATUAÇÃO:\n${config.service_areas.join(', ')}`;
  }
  
  // Add structured region knowledge
  prompt += generateRegionKnowledge();

  prompt += `\n\nSERVIÇOS OFERECIDOS:
${config.services.map(s => `• ${s}`).join('\n')}`;

  // Vista CRM Integration - Property Search Instructions
  if (config.vista_integration_enabled !== false) {
    prompt += `\n\n🏠 BUSCA DE IMÓVEIS (USE buscar_imoveis):
Quando tiver 2+ critérios do cliente, USE A FUNÇÃO buscar_imoveis imediatamente!
Não espere ter todas as informações - comece a buscar com o que tem.

🏢 ENCAMINHAMENTO PARA C2S (USE enviar_lead_c2s):
⚠️ QUANDO USAR: Se o cliente quer COMPRAR (finalidade=venda), após qualificar:
1. Colete: tipo de imóvel, bairro e faixa de preço
2. Chame a função enviar_lead_c2s com os dados coletados
3. Informe ao cliente: "Vou te passar para um corretor especializado em vendas! Ele vai entrar em contato 😊"
4. NÃO continue a conversa após o handoff - o corretor assume daqui`;
  }

  // Rapport Techniques (simplified - main rapport is in the 5-step flow)
  if (config.rapport_enabled && config.rapport_mirror_language) {
    prompt += `\n\nRAPPORT: Adapte seu estilo de comunicação ao do cliente (formal/informal).`;
  }

  // Mental Triggers
  if (config.triggers_enabled) {
    prompt += `\n\nGATILHOS DE CONVERSÃO (use quando apropriado):`;
    if (config.trigger_urgency) {
      prompt += `\n- Urgência: Mencione prazos ou condições especiais quando existirem`;
    }
    if (config.trigger_scarcity) {
      prompt += `\n- Escassez: Mencione disponibilidade limitada de forma honesta`;
    }
    if (config.trigger_social_proof && config.social_proof_text) {
      prompt += `\n- Prova Social: "${config.social_proof_text}"`;
    }
    if (config.trigger_authority && config.authority_text) {
      prompt += `\n- Autoridade: "${config.authority_text}"`;
    }
  }

  // Objections Handling
  if (config.objections && config.objections.length > 0) {
    prompt += `\n\nTRATAMENTO DE OBJEÇÕES:`;
    for (const obj of config.objections) {
      prompt += `\nSe disser: "${obj.objection}" → Responda: "${obj.response}"`;
    }
  }

  // Knowledge Base
  if (config.knowledge_base_content) {
    prompt += `\n\nBASE DE CONHECIMENTO:\n${config.knowledge_base_content}`;
  }

  // Limitations
  if (config.limitations && config.limitations.length > 0) {
    prompt += `\n\nLIMITAÇÕES (encaminhe ao atendente humano):
${config.limitations.map(l => `• ${l}`).join('\n')}`;
  }

  // Escalation Criteria
  if (config.escalation_criteria && config.escalation_criteria.length > 0) {
    prompt += `\n\nCRITÉRIOS PARA ESCALONAMENTO:
${config.escalation_criteria.map(c => `• ${c}`).join('\n')}`;
  }

  // FAQs
  if (config.faqs && config.faqs.length > 0) {
    prompt += `\n\nPERGUNTAS FREQUENTES:
${config.faqs.map(faq => `P: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}`;
  }

  // Custom Instructions
  if (config.custom_instructions) {
    prompt += `\n\nINSTRUÇÕES ESPECIAIS:\n${config.custom_instructions}`;
  }

  // Humanization
  if (config.humanize_responses) {
    prompt += `\n\nESTILO HUMANIZADO:
- Linguagem natural e coloquial
- Interjeições como "olha só", "então"
- Demonstre empatia`;

    if (config.emoji_intensity !== 'none') {
      const emojiLevel = config.emoji_intensity === 'low' ? '1-2 por mensagem' : '2-3 por mensagem';
      prompt += `\n- Use emojis ${emojiLevel}`;
    }
  }

  prompt += `\n\n⚠️ REGRAS DE FORMATAÇÃO PARA WHATSAPP (ESTILO LAÍS):
- MÁXIMO 2 FRASES por mensagem (curtas!)
- Use BULLETS (•) para listar informações
- Emojis estratégicos: 🏠📍✅🎉😊 (1-2 por mensagem)
- QUEBRAR informações longas em múltiplas mensagens
- NUNCA envie parágrafos longos
- NUNCA inclua URLs ou links no texto
- NUNCA use markdown de imagem
- NUNCA liste características de imóveis (o sistema faz automaticamente)

⚠️ REGRA DE APRESENTAÇÃO DE IMÓVEIS:
- NUNCA mostre mais de 1 imóvel por vez
- Após mostrar, SEMPRE pergunte "Faz sentido pra você? 😊"
- AGUARDE a resposta antes de mostrar outra opção
- Use linguagem EMPOLGANTE: "Achei uma opção ótima!" ao invés de "Achei uma opção"

💰 PERGUNTAS SOBRE VALORES E CUSTOS:
- Se o cliente perguntar sobre CONDOMÍNIO: O valor já foi informado na ficha do imóvel (se disponível). Se não foi mostrado, diga que vai confirmar o valor exato com a equipe.
- Se o cliente perguntar sobre IPTU: Informe que o valor exato será confirmado na visita ou pelo corretor.
- Se o cliente perguntar sobre CUSTO TOTAL (aluguel + condomínio): Faça a soma e informe de forma clara. Ex: "O aluguel é R$ 3.500 + condomínio de R$ 650, totalizando R$ 4.150/mês."
- Sempre seja transparente sobre os custos para gerar confiança!`;

  return prompt;
}

// Fragment long messages into smaller parts - aggressive fragmentation for WhatsApp
function fragmentMessage(text: string, maxLength: number = 100): string[] {
  if (text.length <= maxLength) return [text];
  
  const fragments: string[] = [];
  
  // First, try to split by double line breaks (paragraphs)
  const paragraphs = text.split(/\n\n+/);
  
  for (const paragraph of paragraphs) {
    // Then split by sentence endings
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let currentFragment = '';
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;
      
      if ((currentFragment + ' ' + trimmedSentence).trim().length <= maxLength) {
        currentFragment = (currentFragment + ' ' + trimmedSentence).trim();
      } else {
        if (currentFragment) fragments.push(currentFragment);
        
        // If single sentence is too long, split by comma or colon
        if (trimmedSentence.length > maxLength) {
          const parts = trimmedSentence.split(/[,;:]\s*/);
          let subFragment = '';
          for (const part of parts) {
            if ((subFragment + ', ' + part).length <= maxLength) {
              subFragment = subFragment ? subFragment + ', ' + part : part;
            } else {
              if (subFragment) fragments.push(subFragment);
              subFragment = part;
            }
          }
          currentFragment = subFragment;
        } else {
          currentFragment = trimmedSentence;
        }
      }
    }
    
    if (currentFragment) fragments.push(currentFragment);
  }
  
  // Final pass: hard split any remaining long fragments
  return fragments.flatMap(frag => {
    if (frag.length <= maxLength) return [frag];
    // Hard split at word boundaries
    const words = frag.split(/\s+/);
    const result: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length <= maxLength) {
        current = (current + ' ' + word).trim();
      } else {
        if (current) result.push(current);
        current = word;
      }
    }
    if (current) result.push(current);
    return result;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ========== ANTI-LOOP SYSTEM (ported from make-webhook) ==========

interface QualificationDataForLoop {
  detected_neighborhood?: string | null;
  detected_bedrooms?: number | null;
  detected_budget_max?: number | null;
  detected_property_type?: string | null;
  detected_interest?: string | null;
}

function buildContextSummaryForAntiLoop(qualificationData: QualificationDataForLoop | null): string {
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

function isLoopingQuestion(aiResponse: string, qualificationData: QualificationDataForLoop | null): boolean {
  if (!qualificationData) return false;
  
  const lower = aiResponse.toLowerCase();
  
  // If already has region and AI asked region again
  if (qualificationData.detected_neighborhood) {
    if (/qual\s+(regi[aã]o|bairro)|onde\s+voc[eê]|localiza[cç][aã]o|prefer[eê]ncia.*regi|que\s+regi/i.test(lower)) {
      console.log('⚠️ [ANTI-LOOP] Loop detected: asking region again');
      return true;
    }
  }
  
  // If already has bedrooms and AI asked again
  if (qualificationData.detected_bedrooms) {
    if (/quantos?\s+quartos?|n[uú]mero\s+de\s+(quartos?|dormit[oó]rios?)|quantos\s+dormit/i.test(lower)) {
      console.log('⚠️ [ANTI-LOOP] Loop detected: asking bedrooms again');
      return true;
    }
  }
  
  // If already has budget and AI asked again
  if (qualificationData.detected_budget_max) {
    if (/faixa\s+de\s+(valor|pre[cç]o)|or[cç]amento|quanto\s+(quer|pode)\s+pagar|qual.*valor/i.test(lower)) {
      console.log('⚠️ [ANTI-LOOP] Loop detected: asking budget again');
      return true;
    }
  }
  
  // If already has property type and AI asked again
  if (qualificationData.detected_property_type) {
    if (/que\s+tipo|qual\s+tipo|tipo\s+de\s+im[oó]vel|apartamento.*casa|busca\s+apartamento/i.test(lower)) {
      console.log('⚠️ [ANTI-LOOP] Loop detected: asking property type again');
      return true;
    }
  }
  
  // If already has purpose and AI asked again (for vendas)
  if (qualificationData.detected_interest) {
    if (/morar\s+ou\s+investir|para\s+morar|para\s+investir|objetivo|finalidade/i.test(lower)) {
      console.log('⚠️ [ANTI-LOOP] Loop detected: asking purpose again');
      return true;
    }
  }
  
  return false;
}

// Get the next logical question to ask based on what's missing
function getNextLogicalQuestion(qualificationData: QualificationDataForLoop | null): string {
  if (!qualificationData) {
    return "Qual região de Floripa você prefere? 😊";
  }
  
  // Order: Region → Type → Bedrooms → Budget
  if (!qualificationData.detected_neighborhood) {
    return "Qual região de Floripa você prefere? 😊";
  }
  if (!qualificationData.detected_property_type) {
    return "Você busca apartamento, casa ou outro tipo de imóvel?";
  }
  if (!qualificationData.detected_bedrooms) {
    return "Quantos quartos você precisa?";
  }
  if (!qualificationData.detected_budget_max) {
    return "E qual seria sua faixa de orçamento mensal?";
  }
  
  // All collected - proceed to search
  return "Perfeito! Vou buscar opções pra você! 🏠";
}

// Anti-repetition: check if AI is sending the exact same message
let lastAIMessages: Map<string, string> = new Map();

function isRepetitiveMessage(phoneNumber: string, message: string): boolean {
  const lastMessage = lastAIMessages.get(phoneNumber);
  if (lastMessage && lastMessage === message) {
    console.log('⚠️ [ANTI-LOOP] Repetitive message detected - same as last');
    return true;
  }
  lastAIMessages.set(phoneNumber, message);
  
  // Cleanup old entries to prevent memory leak
  if (lastAIMessages.size > 1000) {
    const keys = Array.from(lastAIMessages.keys());
    keys.slice(0, 500).forEach(k => lastAIMessages.delete(k));
  }
  
  return false;
}

async function getQualificationDataForAntiLoop(phoneNumber: string): Promise<QualificationDataForLoop | null> {
  try {
    const { data } = await supabase
      .from('lead_qualification')
      .select('detected_neighborhood, detected_bedrooms, detected_budget_max, detected_property_type, detected_interest')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    return data;
  } catch (error) {
    console.error('❌ Error getting qualification data for anti-loop:', error);
    return null;
  }
}

// Sanitize AI message: remove markdown images, URLs, and clean formatting
function sanitizeAIMessage(text: string): string {
  if (!text) return '';
  
  let cleaned = text
    // Remove markdown images ![...](...)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove raw URLs (http/https)
    .replace(/https?:\/\/[^\s\)]+/g, '')
    // Remove markdown headers
    .replace(/^#{1,4}\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove property listing patterns (numbered lists with property details)
    .replace(/\d+\.\s+\*\*[^*]+\*\*[\s\S]*?(?=\d+\.\s+\*\*|$)/g, '')
    // Remove bold markdown for property names
    .replace(/\*\*Apartamento\s+\d+\*\*/g, '')
    .replace(/\*\*Imóvel\s+\d+\*\*/g, '')
    // Remove excessive asterisks
    .replace(/\*{2,}/g, '')
    // Remove multiple consecutive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove lines that are just bullets with property info
    .replace(/^[-•]\s*\d+\s*(dormitório|quarto|vaga|m²|R\$).*$/gim, '')
    // Remove empty bullet points
    .replace(/^[-•]\s*$/gm, '')
    // Trim whitespace
    .trim();
  
  // If after cleaning we have almost nothing, return a fallback
  if (cleaned.length < 10) {
    return 'Vou te mostrar o que encontrei!';
  }
  
  return cleaned;
}

// Search properties using Vista CRM API - with neighborhood normalization
async function searchProperties(params: Record<string, any>): Promise<any> {
  try {
    // Normalize neighborhood before searching
    let normalizedParams = { ...params };
    
    if (params.bairro) {
      const expansion = expandRegionToNeighborhoods(params.bairro);
      
      // If it's a region, log it but use the first neighborhood for now
      // (Vista API doesn't support multiple neighborhoods in one query)
      if (expansion.isRegion) {
        console.log(`📍 Region detected: ${params.bairro} → ${expansion.regionName}`);
        console.log(`📍 Contains neighborhoods: ${expansion.neighborhoods.slice(0, 5).join(', ')}...`);
        // For now, use the most popular neighborhood from that region
        normalizedParams.bairro = expansion.neighborhoods[0];
      } else {
        // Normalize potential typos
        const normalized = normalizeNeighborhood(params.bairro);
        if (normalized.confidence < 1.0 && normalized.confidence >= 0.6) {
          console.log(`📍 Normalized "${params.bairro}" → "${normalized.normalized}" (confidence: ${normalized.confidence.toFixed(2)})`);
        }
        normalizedParams.bairro = normalized.normalized;
      }
    }
    
    console.log('🏠 Searching properties with params:', normalizedParams);
    
    const { data, error } = await supabase.functions.invoke('vista-search-properties', {
      body: normalizedParams
    });

    if (error) {
      console.error('❌ Vista search error:', error);
      return { success: false, properties: [], error: error.message };
    }

    console.log(`✅ Vista search returned ${data?.properties?.length || 0} properties`);
    return data;
  } catch (e) {
    console.error('❌ Error calling Vista search:', e);
    return { success: false, properties: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// Format property for WhatsApp message
function formatPropertyMessage(property: any): string {
  const lines = [
    `🏠 *${property.tipo} em ${property.bairro}*`,
  ];
  
  if (property.quartos > 0) {
    const suiteText = property.suites > 0 ? ` (${property.suites} suíte${property.suites > 1 ? 's' : ''})` : '';
    lines.push(`• ${property.quartos} dormitório${property.quartos > 1 ? 's' : ''}${suiteText}`);
  }
  if (property.vagas > 0) {
    lines.push(`• ${property.vagas} vaga${property.vagas > 1 ? 's' : ''} de garagem`);
  }
  if (property.area_util > 0) {
    lines.push(`• ${property.area_util}m² de área útil`);
  }
  lines.push(`• ${property.preco_formatado}`);
  
  // Add condominium value if available (for rentals)
  if (property.valor_condominio && property.valor_condominio > 0) {
    const condFormatado = property.valor_condominio.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    lines.push(`• Condomínio: ${condFormatado}`);
  }
  
  // Add truncated description if available (max 150 chars for WhatsApp readability)
  if (property.descricao && property.descricao.trim().length > 0) {
    const descricaoLimpa = property.descricao.trim();
    const descricaoResumida = descricaoLimpa.length > 150 
      ? descricaoLimpa.substring(0, 150).trim() + '...'
      : descricaoLimpa;
    lines.push(`📝 ${descricaoResumida}`);
  }
  
  lines.push(`🔗 ${property.link}`);
  
  return lines.join('\n');
}

// Format property details like Laís style (for portal leads)
function formatPropertyDetailsLikeLais(property: any, portalOrigin?: string): string {
  const lines: string[] = [];
  
  // Location header
  const endereco = property.endereco || '';
  const bairro = property.bairro || '';
  const cidade = property.cidade || 'Florianópolis';
  
  if (endereco || bairro) {
    lines.push(`📍 ${endereco}${endereco && bairro ? ', ' : ''}${bairro} - ${cidade}`);
  }
  
  // Property characteristics
  const characteristics: string[] = [];
  
  if (property.dormitorios || property.quartos) {
    const quartos = property.dormitorios || property.quartos;
    const suites = property.suites || 0;
    const suiteText = suites > 0 ? `, sendo ${suites} suíte${suites > 1 ? 's' : ''}` : '';
    characteristics.push(`${quartos} dormitório${quartos > 1 ? 's' : ''}${suiteText}`);
  }
  
  if (property.area_util || property.area_privativa) {
    const area = property.area_util || property.area_privativa;
    characteristics.push(`área privativa de ${area}m²`);
  }
  
  if (property.vagas) {
    characteristics.push(`${property.vagas} vaga${property.vagas > 1 ? 's' : ''} de garagem`);
  }
  
  // Add characteristics as bullet point
  if (characteristics.length > 0) {
    lines.push(`• ${characteristics.join(', ')}`);
  }
  
  // Price
  const preco = property.preco_formatado || 
    (property.valor_venda ? `R$ ${property.valor_venda.toLocaleString('pt-BR')}` : 
     property.valor_locacao ? `R$ ${property.valor_locacao.toLocaleString('pt-BR')}/mês` : null);
  
  if (preco) {
    lines.push(`• Valor: ${preco}`);
  }
  
  // Add condominium value if available
  const valorCondominio = property.valor_condominio || property.ValorCondominio;
  if (valorCondominio && parseFloat(valorCondominio) > 0) {
    const condFormatado = parseFloat(valorCondominio).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    lines.push(`• Condomínio: ${condFormatado}`);
  }
  
  // Add truncated description if available (max 150 chars for WhatsApp readability)
  const descricao = property.descricao || property.Descricao;
  if (descricao && descricao.trim().length > 0) {
    const descricaoLimpa = descricao.trim();
    const descricaoResumida = descricaoLimpa.length > 150 
      ? descricaoLimpa.substring(0, 150).trim() + '...'
      : descricaoLimpa;
    lines.push(`📝 ${descricaoResumida}`);
  }
  
  // Link
  const codigo = property.codigo || property.Codigo;
  if (codigo) {
    lines.push(`\n🔗 smolkaimoveis.com.br/imovel/${codigo}`);
  }
  
  return lines.join('\n');
}

/**
 * Fetch property by listing ID from Vista CRM
 */
async function getPropertyByListingId(listingId: string): Promise<any | null> {
  try {
    console.log(`🏠 Fetching property by listing ID: ${listingId}`);
    
    const { data, error } = await supabase.functions.invoke('vista-get-property', {
      body: { codigo: listingId }
    });
    
    if (error || !data?.success) {
      console.log(`⚠️ Property not found for listing ID: ${listingId}`, error || data?.error);
      return null;
    }
    
    console.log(`✅ Found property:`, data.property);
    return data.property;
  } catch (e) {
    console.error(`❌ Error fetching property ${listingId}:`, e);
    return null;
  }
}

// Send lead to C2S system
async function sendLeadToC2S(params: Record<string, any>, phoneNumber: string, conversationHistory: string, contactName?: string): Promise<{ success: boolean; c2s_lead_id?: string; error?: string }> {
  try {
    console.log('🏢 Sending lead to C2S:', params);
    
    const { data, error } = await supabase.functions.invoke('c2s-create-lead', {
      body: {
        name: params.nome || contactName || 'Lead WhatsApp',
        phone: phoneNumber,
        type_negotiation: 'Compra',
        property_type: params.tipo_imovel,
        neighborhood: params.bairro,
        price_range: params.faixa_preco,
        bedrooms: params.quartos,
        description: params.interesse,
        conversation_history: conversationHistory,
      }
    });

    if (error) {
      console.error('❌ C2S send error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Lead sent to C2S:', data);
    return { success: true, c2s_lead_id: data?.c2s_lead_id };
  } catch (e) {
    console.error('❌ Error calling C2S:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

async function callAIWithTools(config: AIAgentConfig, messages: any[], useTools: boolean = true): Promise<{ content: string; toolCalls?: any[] }> {
  const provider = config.ai_provider || 'openai';
  
  console.log(`🤖 Using AI provider: ${provider}, model: ${config.ai_model}, tools: ${useTools}`);
  
  if (provider === 'openai') {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const requestBody: any = {
      model: config.ai_model || 'gpt-4o-mini',
      messages,
      max_tokens: config.max_tokens || 500,
      temperature: 0.8,
    };

    // Add tools only if enabled and Vista integration is on
    if (useTools && config.vista_integration_enabled !== false) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded - aguarde alguns segundos');
      }
      if (response.status === 402 || response.status === 401) {
        throw new Error('Erro de autenticação/créditos OpenAI');
      }
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
      return {
        content: choice.message.content || '',
        toolCalls: choice.message.tool_calls
      };
    }
    
    return { content: choice?.message?.content || '' };
  } else {
    // Lovable AI doesn't support tool calling, so we use a workaround
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai_model || 'openai/gpt-5',
        messages,
        max_tokens: config.max_tokens || 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded - aguarde alguns segundos');
      }
      if (response.status === 402) {
        throw new Error('Créditos Lovable esgotados');
      }
      throw new Error(`Lovable AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    return { content: data.choices?.[0]?.message?.content || '' };
  }
}

async function generateAudio(text: string, config: AIAgentConfig): Promise<{ audioUrl: string; isVoiceMessage: boolean } | null> {
  if (!config.audio_enabled) return null;
  
  try {
    console.log('🎙️ Generating audio for text:', text.substring(0, 50));
    
    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text,
        voiceId: config.audio_voice_id || undefined,
        voiceName: config.audio_voice_name || 'Sarah',
      }
    });

    if (error || !data?.success) {
      console.error('❌ Audio generation failed:', error || data?.error);
      return null;
    }

    console.log('✅ Audio generated:', data.audioUrl, 'isVoiceMessage:', data.isVoiceMessage);
    return {
      audioUrl: data.audioUrl,
      isVoiceMessage: data.isVoiceMessage || false
    };
  } catch (e) {
    console.error('❌ Error generating audio:', e);
    return null;
  }
}

// ========== PORTAL LEAD QUALIFICATION FUNCTIONS ==========

interface EssentialQuestion {
  id: string;
  question: string;
  category: string;
  isQualifying: boolean;
  isLocked: boolean;
  order: number;
  enabled: boolean;
}

interface AIBehaviorConfig {
  id: string;
  essential_questions: EssentialQuestion[];
  functions: any[];
  reengagement_hours: number;
  send_cold_leads: boolean;
  require_cpf_for_visit: boolean;
  visit_schedule: any;
}

/**
 * Get AI behavior config from database
 */
async function getAIBehaviorConfig(): Promise<AIBehaviorConfig | null> {
  const { data } = await supabase
    .from('ai_behavior_config')
    .select('*')
    .limit(1)
    .single();
  return data as AIBehaviorConfig | null;
}

/**
 * Check if phone number has a recent portal lead (within 48h)
 */
async function isPortalLead(phoneNumber: string): Promise<{
  isPortal: boolean;
  portalData?: any;
  qualificationId?: string;
  qualificationData?: any;
}> {
  // Clean phone number for comparison
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Search for recent portal leads
  const { data } = await supabase
    .from('portal_leads_log')
    .select('*')
    .or(`contact_phone.eq.${phoneNumber},contact_phone.eq.${cleanPhone},contact_phone.ilike.%${cleanPhone.slice(-8)}%`)
    .gte('created_at', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!data) {
    return { isPortal: false };
  }
  
  // Get associated qualification if exists
  let qualificationData = null;
  if (data.qualification_id) {
    const { data: qual } = await supabase
      .from('lead_qualification')
      .select('*')
      .eq('id', data.qualification_id)
      .single();
    qualificationData = qual;
  } else {
    // Try to find by phone number
    const { data: qual } = await supabase
      .from('lead_qualification')
      .select('*')
      .or(`phone_number.eq.${phoneNumber},phone_number.eq.${cleanPhone}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    qualificationData = qual;
  }
  
  return {
    isPortal: true,
    portalData: data,
    qualificationId: qualificationData?.id || data.qualification_id,
    qualificationData
  };
}

/**
 * Update lead qualification in database
 */
async function updateLeadQualification(
  qualificationId: string, 
  updates: Record<string, any>
): Promise<boolean> {
  const { error } = await supabase
    .from('lead_qualification')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', qualificationId);
    
  if (error) {
    console.error('❌ Error updating lead qualification:', error);
    return false;
  }
  
  console.log('✅ Lead qualification updated:', updates);
  return true;
}

/**
 * Detect if lead is a broker or curious (disqualify)
 */
function detectDisqualificationReason(message: string, history: string[]): {
  isDisqualified: boolean;
  reason?: 'corretor' | 'curioso' | 'sem_interesse' | 'fora_perfil';
} {
  const lower = message.toLowerCase();
  const fullContext = [message, ...history].join(' ').toLowerCase();
  
  // Corretor/Imobiliária patterns
  const corretorPatterns = /corretor|imobili[aá]ria|parceria|tenho.*cliente|represento?|capta[çc][aã]o|creci|sou.*corretor|trabalho.*imobili/i;
  if (corretorPatterns.test(fullContext)) {
    return { isDisqualified: true, reason: 'corretor' };
  }
  
  // Curioso patterns (very vague responses, no real interest)
  const curiosoCount = (fullContext.match(/s[oó].*olhando|s[oó].*curiosidade|depois.*vejo|talvez|quem sabe|n[aã]o sei/gi) || []).length;
  if (curiosoCount >= 2) {
    return { isDisqualified: true, reason: 'curioso' };
  }
  
  // Sem interesse patterns
  const semInteressePatterns = /n[aã]o.*interesse|desist|n[aã]o.*mais|n[aã]o.*quero|cancel/i;
  if (semInteressePatterns.test(lower)) {
    return { isDisqualified: true, reason: 'sem_interesse' };
  }
  
  return { isDisqualified: false };
}

/**
 * Calculate qualification score based on answers
 */
function calculateQualificationScore(answers: Record<string, string>, questions: EssentialQuestion[]): number {
  if (!questions || questions.length === 0) return 0;
  
  const qualifyingQuestions = questions.filter(q => q.isQualifying && q.enabled);
  if (qualifyingQuestions.length === 0) return 50; // Default if no qualifying questions
  
  let answeredQualifying = 0;
  for (const q of qualifyingQuestions) {
    if (answers[q.id] && answers[q.id].trim().length > 0) {
      answeredQualifying++;
    }
  }
  
  // Base score from answered qualifying questions (0-70 points)
  const baseScore = Math.round((answeredQualifying / qualifyingQuestions.length) * 70);
  
  // Bonus for total answers (0-30 points)
  const totalAnswered = Object.keys(answers).filter(k => answers[k] && answers[k].trim().length > 0).length;
  const totalQuestions = questions.filter(q => q.enabled).length;
  const bonusScore = Math.round((Math.min(totalAnswered, totalQuestions) / totalQuestions) * 30);
  
  return Math.min(100, baseScore + bonusScore);
}

/**
 * Extract answer from message for a specific question
 */
function extractAnswerFromMessage(message: string, question: EssentialQuestion): string | null {
  const lower = message.toLowerCase();
  
  // Category-specific extraction
  switch (question.category) {
    case 'operation':
      // Tipo de operação: compra ou locação
      if (/compra|compr[aá]r|adquir|aquisi[çc]/i.test(lower)) return 'compra';
      if (/alug|loca[çc]|locar/i.test(lower)) return 'locacao';
      break;
      
    case 'property':
      // Tipo de imóvel
      if (/apartamento|apto/i.test(lower)) return 'apartamento';
      if (/casa/i.test(lower)) return 'casa';
      if (/terreno/i.test(lower)) return 'terreno';
      if (/cobertura/i.test(lower)) return 'cobertura';
      if (/comercial|loja|sala/i.test(lower)) return 'comercial';
      if (/kitnet|kitnete|kit/i.test(lower)) return 'kitnet';
      break;
      
    case 'location':
      // Extract neighborhood/region
      const neighborhoods = getAllNeighborhoods();
      for (const n of neighborhoods) {
        if (lower.includes(n.toLowerCase())) return n;
      }
      break;
      
    case 'lead_info':
      // Name, contact info - return the message as-is if it looks like an answer
      if (message.trim().length > 2 && message.trim().length < 100) {
        return message.trim();
      }
      break;
  }
  
  return null;
}

/**
 * Build system prompt for portal lead qualification (Laís style)
 */
function buildPortalLeadPrompt(
  config: AIAgentConfig,
  behaviorConfig: AIBehaviorConfig,
  portalData: any,
  qualificationData: any,
  contactName?: string
): string {
  const basePrompt = buildSystemPrompt(config, contactName);
  
  // Get enabled essential questions sorted by order
  const questions = (behaviorConfig.essential_questions || [])
    .filter((q: EssentialQuestion) => q.enabled)
    .sort((a: EssentialQuestion, b: EssentialQuestion) => a.order - b.order);
  
  const answeredQuestions = qualificationData?.answers || {};
  const questionsAsked = qualificationData?.questions_asked || 0;
  
  // Find next unanswered question
  const unansweredQuestions = questions.filter((q: EssentialQuestion) => !answeredQuestions[q.id]);
  const nextQuestion = unansweredQuestions[0];
  
  const portalContext = `
📍 CONTEXTO DO LEAD (PORTAL - ESTILO LAÍS):
- Portal de origem: ${portalData?.portal_origin || 'Não informado'}
- Imóvel de interesse: ${portalData?.origin_listing_id ? `Código ${portalData.origin_listing_id}` : 'Não especificado'}
- Tipo de transação: ${portalData?.transaction_type === 'SELL' ? 'COMPRA' : portalData?.transaction_type === 'RENT' ? 'LOCAÇÃO' : 'Não especificado'}
- Nome do lead: ${contactName || portalData?.contact_name || 'Não informado'}
- Perguntas já feitas: ${questionsAsked}
- Respostas coletadas: ${JSON.stringify(answeredQuestions)}

⚠️ IMPORTANTE: O lead JÁ recebeu a foto e detalhes do imóvel de interesse na primeira mensagem.
Agora você está respondendo às mensagens seguintes do cliente.

📋 FLUXO DE RESPOSTAS (ESTILO LAÍS - CONSULTIVO E PROATIVO):

SE O CLIENTE GOSTOU DO IMÓVEL:
→ "Ótimo${contactName ? `, ${contactName}` : ''}! 🎉 Posso agendar uma visita pra você conhecer pessoalmente?"
→ Se sim: "Qual dia seria melhor pra você?"
→ Depois: "Perfeito! Manhã ou tarde?"
→ Confirme: "Anotei! ${contactName || 'Você'}, visita no [dia] à [período]. Vou te mandar a localização! 📍"
→ Finalize: "Mal posso esperar pra você conhecer o imóvel! Até lá! 🙌"

SE O CLIENTE QUER ALGO DIFERENTE:
→ "Entendi! Me conta o que você tá buscando de diferente? 😊"
→ Colete de forma NATURAL: tipo, quartos, bairro, preço
→ Use buscar_imoveis para encontrar alternativas
→ "Achei uma opção que pode combinar mais com você! 🎉"
→ Apresente com foto + detalhes

SE O CLIENTE TEM DÚVIDA SOBRE O IMÓVEL:
→ Responda de forma clara e objetiva
→ Depois: "Ficou alguma outra dúvida? Posso agendar uma visita pra você ver de perto! 😊"

SE O CLIENTE É CORRETOR:
→ "Obrigada pelo interesse! No momento estamos focados em atendimento direto a compradores. Boas vendas! 😊"
→ Encerre a conversa

SE O CLIENTE ESTÁ CURIOSO/VAGO:
→ Tente uma vez: "Entendo! Quando tiver um interesse mais definido, pode contar com a gente. 😊"
→ Se continuar vago: "Fico à disposição quando precisar! Até breve! 😊"

📋 PERGUNTAS ESSENCIAIS RESTANTES (faça de forma NATURAL, uma por vez):
${unansweredQuestions.map((q: EssentialQuestion) => `- ${q.question}`).join('\n') || '(todas respondidas - pode prosseguir para agendamento ou buscar novas opções)'}

🎯 OBJETIVO PRINCIPAL: 
- Se GOSTOU do imóvel → Agendar visita (fluxo completo!)
- Se QUER DIFERENTE → Qualificar e buscar alternativas  
- Se é VENDA e qualificado (score >= 70) → Enviar para C2S com enviar_lead_c2s

💡 DICAS DE ATENDIMENTO ESTILO LAÍS (SIGA SEMPRE!):
- Mensagens CURTAS: máx 2 frases por mensagem
- Use o nome "${contactName || 'do cliente'}" naturalmente
- Seja PROATIVA: "Posso agendar?" ao invés de "Quer agendar?"
- Use emojis com moderação (1-2 por mensagem): 🏠😊🎉📍
- Tom CONSULTIVO: "Me conta...", "Entendi!", "Ótima escolha!"
- Tom EMPOLGANTE quando encontrar imóvel: "Achei uma opção ótima!"
- Valide escolhas: "Ótima região!", "Faz muito sentido!"
`;

  return basePrompt + portalContext;
}

/**
 * Handle portal lead qualification flow
 */
async function handlePortalLeadQualification(
  phoneNumber: string,
  messageBody: string,
  messageType: string,
  contactName: string | undefined,
  portalCheck: { isPortal: boolean; portalData?: any; qualificationId?: string; qualificationData?: any },
  behaviorConfig: AIBehaviorConfig,
  config: AIAgentConfig
): Promise<Response> {
  console.log('🎯 Handling portal lead qualification flow');
  
  const qualificationId = portalCheck.qualificationId;
  const qualificationData = portalCheck.qualificationData || {};
  const portalData = portalCheck.portalData;
  
  // Get enabled essential questions
  const questions = (behaviorConfig.essential_questions || [])
    .filter((q: EssentialQuestion) => q.enabled)
    .sort((a: EssentialQuestion, b: EssentialQuestion) => a.order - b.order);
  
  // Get current answers
  const currentAnswers = qualificationData.answers || {};
  const questionsAsked = qualificationData.questions_asked || 0;
  
  // ========== FIRST INTERACTION: PROACTIVE PROPERTY SEND (LAÍS STYLE) ==========
  const isFirstInteraction = !portalData?.ai_attended;
  
  if (isFirstInteraction) {
    console.log('👋 First interaction with portal lead - sending proactive property info');
    
    // Mark as AI attended
    await supabase
      .from('portal_leads_log')
      .update({ 
        ai_attended: true,
        ai_attended_at: new Date().toISOString()
      })
      .eq('id', portalData.id);
    console.log('✅ Marked portal lead as AI attended');
    
    // Get contact name from portal data if not provided
    const leadName = contactName || portalData?.contact_name || '';
    const portalOrigin = portalData?.portal_origin || 'portal';
    const listingId = portalData?.origin_listing_id || portalData?.client_listing_id;
    
    // Build greeting message - ESTILO LAÍS: Contextualizado e acolhedor
    const portalName = portalOrigin.toLowerCase().includes('olx') ? 'OLX' : 
                       portalOrigin.toLowerCase().includes('zap') ? 'ZAP Imóveis' : 
                       portalOrigin.toLowerCase().includes('viva') ? 'VivaReal' : 
                       portalOrigin;
    
    const greeting = leadName 
      ? `Oi, ${leadName}! 👋`
      : `Oi! 👋`;
    
    await sendWhatsAppMessage(phoneNumber, greeting);
    await sleep(1000);
    
    const intro = `Aqui é a ${config.agent_name} da ${config.company_name} 🏠`;
    await sendWhatsAppMessage(phoneNumber, intro);
    await sleep(1500);
    
    // Try to fetch the property
    let property = null;
    if (listingId) {
      property = await getPropertyByListingId(listingId);
    }
    
    if (property) {
      // Contextual intro about the property - ESTILO LAÍS
      const contextMessage = `Vi que você se interessou por esse imóvel pelo ${portalName}! 😊`;
      await sendWhatsAppMessage(phoneNumber, contextMessage);
      await sleep(1500);
      
      // Send property photo FIRST (proactive - Laís style)
      const photoUrl = property.foto_destaque || property.FotoDestaque;
      if (photoUrl) {
        await sendWhatsAppImage(phoneNumber, photoUrl, '🏠');
        await sleep(1500);
      }
      
      // Send property details in Laís format (bullets, clean)
      const propertyDetails = formatPropertyDetailsLikeLais(property, portalOrigin);
      await sendWhatsAppMessage(phoneNumber, propertyDetails);
      await sleep(2000);
      
      // Proactive follow-up question - ESTILO LAÍS (consultivo)
      const followUpQuestion = `Gostou da opção${leadName ? `, ${leadName}` : ''}? 😊`;
      await sendWhatsAppMessage(phoneNumber, followUpQuestion);
      await sleep(1000);
      
      const followUpQuestion2 = 'Se quiser, posso agendar uma visita pra você conhecer!';
      await sendWhatsAppMessage(phoneNumber, followUpQuestion2);
      
      // Pre-fill operation type from portal data
      let updatedAnswers = { ...currentAnswers };
      if (portalData?.transaction_type === 'SELL') {
        updatedAnswers['operation'] = 'compra';
      } else if (portalData?.transaction_type === 'RENT') {
        updatedAnswers['operation'] = 'locacao';
      }
      
      // Update qualification with initial data
      if (qualificationId) {
        await updateLeadQualification(qualificationId, {
          answers: updatedAnswers,
          qualification_status: 'qualifying',
          questions_asked: 1,
          ai_messages: 1,
          total_messages: 1,
          last_interaction_at: new Date().toISOString()
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'proactive_property_sent',
          propertyCode: property.codigo || listingId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // No property found - send generic greeting and ask what they're looking for
      const genericMessage = `Vi que você entrou em contato pelo ${portalOrigin}! Como posso te ajudar? 😊`;
      await sendWhatsAppMessage(phoneNumber, genericMessage);
      
      if (qualificationId) {
        await updateLeadQualification(qualificationId, {
          qualification_status: 'qualifying',
          questions_asked: 1,
          ai_messages: 1,
          total_messages: 1,
          last_interaction_at: new Date().toISOString()
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'generic_greeting_sent',
          reason: 'property_not_found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
  // ========== END FIRST INTERACTION ==========
  
  // Check for disqualification
  const historyMessages = await getRecentMessages(phoneNumber, 10);
  const historyText = historyMessages.map((m: any) => m.body || '').filter(Boolean);
  const disqualCheck = detectDisqualificationReason(messageBody, historyText);
  
  if (disqualCheck.isDisqualified && qualificationId) {
    console.log(`❌ Lead disqualified: ${disqualCheck.reason}`);
    
    await updateLeadQualification(qualificationId, {
      qualification_status: 'disqualified',
      disqualification_reason: disqualCheck.reason,
      completed_at: new Date().toISOString()
    });
    
    // Send polite closing message
    let closingMessage = '';
    switch (disqualCheck.reason) {
      case 'corretor':
        closingMessage = 'Obrigada pelo interesse! No momento estamos focados em atendimento direto a compradores e locatários. Boas vendas! 😊';
        break;
      case 'curioso':
        closingMessage = 'Entendi! Quando tiver um interesse mais definido, pode nos procurar. Até breve! 😊';
        break;
      case 'sem_interesse':
        closingMessage = 'Tudo bem! Se mudar de ideia no futuro, estaremos aqui. Obrigada! 😊';
        break;
      default:
        closingMessage = 'Obrigada pelo contato! 😊';
    }
    
    await sendWhatsAppMessage(phoneNumber, closingMessage);
    
    return new Response(
      JSON.stringify({ success: true, action: 'lead_disqualified', reason: disqualCheck.reason }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  
  // Try to extract answers from current message
  let newAnswers = { ...currentAnswers };
  let extractedAny = false;
  
  for (const q of questions) {
    if (!newAnswers[q.id]) {
      const answer = extractAnswerFromMessage(messageBody, q);
      if (answer) {
        newAnswers[q.id] = answer;
        extractedAny = true;
        console.log(`✅ Extracted answer for ${q.category}: ${answer}`);
      }
    }
  }
  
  // Calculate new score
  const newScore = calculateQualificationScore(newAnswers, questions);
  console.log(`📊 Qualification score: ${newScore}%`);
  
  // Update qualification if we extracted new answers
  if (extractedAny && qualificationId) {
    await updateLeadQualification(qualificationId, {
      answers: newAnswers,
      questions_answered: Object.keys(newAnswers).length,
      qualification_score: newScore,
      last_interaction_at: new Date().toISOString()
    });
  }
  
  // Detectar intenção de agendamento na mensagem
  const schedulingKeywords = [
    'agendar', 'visitar', 'ver o imóvel', 'conhecer pessoalmente',
    'marcar visita', 'quero ir', 'qual horário', 'posso visitar',
    'sábado', 'domingo', 'amanhã', 'semana que vem', 'manhã', 'tarde',
    'quero conhecer', 'quero ver', 'visita', 'agendamento'
  ];

  const wantsScheduling = schedulingKeywords.some(keyword => 
    messageBody.toLowerCase().includes(keyword)
  );

  // Helper function to update conversation stage in pipeline
  const updateConversationStage = async (targetOrderIndex: number) => {
    // Get stage by order_index for vendas department (portal leads go to vendas)
    const { data: stage } = await supabase
      .from('conversation_stages')
      .select('id, name')
      .eq('department_code', 'vendas')
      .eq('order_index', targetOrderIndex)
      .maybeSingle();

    if (!stage) {
      console.log(`⚠️ Stage com order_index ${targetOrderIndex} não encontrado para vendas`);
      return;
    }

    // Update conversation stage
    const { error } = await supabase
      .from('conversations')
      .update({ 
        stage_id: stage.id,
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber);

    if (error) {
      console.error('❌ Error updating conversation stage:', error);
    } else {
      console.log(`✅ Pipeline atualizado para: ${stage.name} (order ${targetOrderIndex})`);
    }
  };

  // Update to "Qualificação" stage when first answer is extracted
  if (extractedAny && questionsAsked === 0) {
    console.log('📊 Primeira resposta extraída - movendo para Qualificação');
    await updateConversationStage(2);
  }

  // Determine transaction type for dynamic handoff message
  const isForSale = portalData?.transaction_type === 'SELL' || newAnswers['operation'] === 'compra';
  const transactionType = isForSale ? 'vendas' : 'locação';

  // Check if should send to C2S: score >= 70 OR wants scheduling (for BOTH sale and rental)
  const shouldSendToC2S = (newScore >= 70 || wantsScheduling) && qualificationId;
  
  if (shouldSendToC2S) {
    console.log(`🎉 Lead qualified! Reason: ${wantsScheduling ? 'Agendamento detectado' : 'Score >= 70'}. Sending to C2S...`);
    
    // Build lead data for C2S
    const leadData = {
      nome: contactName || portalData?.contact_name || 'Lead Portal',
      interesse: `Lead qualificado do portal ${portalData?.portal_origin} - ${transactionType.toUpperCase()}`,
      tipo_imovel: newAnswers['property'] || '',
      bairro: newAnswers['location'] || '',
      faixa_preco: newAnswers['budget'] || '',
      quartos: 0
    };
    
    // Build conversation history
    const historyForC2S = historyMessages
      .slice(-10)
      .map((m: any) => `[${m.direction === 'incoming' ? 'Cliente' : 'Agente'}]: ${m.body}`)
      .join('\n');
    
    const c2sResult = await sendLeadToC2S(leadData, phoneNumber, historyForC2S, contactName);
    
    if (c2sResult.success) {
      // Update qualification as sent to CRM
      await updateLeadQualification(qualificationId, {
        qualification_status: 'sent_to_crm',
        sent_to_crm_at: new Date().toISOString()
      });
      
      // Update portal lead log
      await supabase
        .from('portal_leads_log')
        .update({ 
          crm_status: 'sent',
          crm_sent_at: new Date().toISOString()
        })
        .eq('id', portalData.id);

      // Update pipeline to "Enviado C2S" stage (order_index: 3)
      console.log('📤 Enviando para estágio C2S no pipeline');
      await updateConversationStage(3);
      
      // Send handoff message (dynamic based on transaction type)
      const handoffMessage = `Perfeito${contactName ? `, ${contactName}` : ''}! 🎉\n\nVou te passar para um de nossos corretores especializados em ${transactionType}. Ele vai entrar em contato pelo WhatsApp em breve! 😊`;
      await sendWhatsAppMessage(phoneNumber, handoffMessage);
      
      return new Response(
        JSON.stringify({ success: true, action: 'lead_qualified_sent_crm', c2sLeadId: c2sResult.c2s_lead_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // Continue with AI conversation to collect more info
  // Update questions asked counter
  if (qualificationId) {
    await updateLeadQualification(qualificationId, {
      questions_asked: questionsAsked + 1,
      total_messages: (qualificationData.total_messages || 0) + 1,
      ai_messages: (qualificationData.ai_messages || 0) + 1,
      last_interaction_at: new Date().toISOString()
    });
  }
  
  // Build specialized prompt for portal leads
  const systemPrompt = buildPortalLeadPrompt(config, behaviorConfig, portalData, { ...qualificationData, answers: newAnswers }, contactName);
  
  // Get conversation history
  const conversationHistory = historyMessages
    .reverse()
    .map((m: any) => ({
      role: m.direction === 'incoming' ? 'user' : 'assistant',
      content: m.body || ''
    }))
    .filter((m: any) => m.content);
  
  conversationHistory.push({ role: 'user', content: messageBody });
  
  // Call AI
  try {
    const aiResult = await callAIWithTools(config, [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ], config.vista_integration_enabled !== false);
    
    let aiMessage = sanitizeAIMessage(aiResult.content);
    
    // Validate response
    const validation = validateAIResponse(aiMessage);
    if (!validation.valid) {
      aiMessage = FALLBACK_RESPONSE;
    }
    
    // Send response (respecting audio preference)
    const useAudio = messageType === 'audio' && config.audio_enabled;
    
    if (useAudio) {
      const audioResult = await generateAudio(aiMessage, config);
      if (audioResult) {
        await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, aiMessage, audioResult.isVoiceMessage);
      } else {
        await sendWhatsAppMessage(phoneNumber, aiMessage);
      }
    } else {
      const fragments = fragmentMessage(aiMessage, 100);
      for (let i = 0; i < Math.min(fragments.length, 3); i++) {
        await sendWhatsAppMessage(phoneNumber, fragments[i]);
        if (i < fragments.length - 1) await sleep(1500);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        action: 'qualification_continued',
        score: newScore,
        answersCollected: Object.keys(newAnswers).length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('❌ Error in portal lead qualification:', error);
    throw error;
  }
}

/**
 * Get recent messages for a phone number
 */
async function getRecentMessages(phoneNumber: string, limit: number = 10): Promise<any[]> {
  const { data } = await supabase
    .from('messages')
    .select('body, direction, created_at')
    .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  return data || [];
}

// ========== TRIAGE FLOW FUNCTIONS ==========

/**
 * Update triage stage in conversation_states
 */
async function updateTriageStage(phoneNumber: string, stage: string): Promise<void> {
  const { error } = await supabase
    .from('conversation_states')
    .upsert({ 
      phone_number: phoneNumber, 
      triage_stage: stage,
      is_ai_active: true,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'phone_number' 
    });
    
  if (error) {
    console.error('❌ Error updating triage stage:', error);
  } else {
    console.log(`✅ Triage stage updated to: ${stage}`);
  }
}

/**
 * Send greeting message (step 1 of new flow)
 * Mirrors the communication channel from the start
 */
async function sendGreeting(phoneNumber: string, config: AIAgentConfig, useAudio: boolean = false): Promise<void> {
  const greetingText = `Olá! Aqui é a ${config.agent_name} da ${config.company_name} 🏠`;
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(greetingText, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, greetingText, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, greetingText);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, greetingText);
  }
  
  console.log('✅ Greeting sent');
}

/**
 * Ask for name (step 2 of new flow)
 */
async function askForName(phoneNumber: string, config: AIAgentConfig, useAudio: boolean = false): Promise<void> {
  const askNameText = 'Como você se chama?';
  
  await sleep(800);
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(askNameText, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, askNameText, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, askNameText);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, askNameText);
  }
  
  console.log('✅ Asked for name');
}

/**
 * Send preference question (step 3 of new flow)
 */
async function sendPreferenceQuestion(phoneNumber: string, name: string, config: AIAgentConfig, useAudio: boolean = false): Promise<void> {
  // First confirm the name
  const confirmText = `Prazer, ${name}! 😊`;
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(confirmText, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, confirmText, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, confirmText);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, confirmText);
  }
  
  await sleep(800);
  
  // Then ask for preference
  const preferenceText = 'Você prefere receber as informações por texto ou áudio? 📝🎧';
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(preferenceText, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, preferenceText, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, preferenceText);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, preferenceText);
  }
  
  console.log('✅ Preference question sent');
}

/**
 * Extract communication preference from message
 * Returns 'audio', 'texto', or null if not detected
 */
function extractCommunicationPreference(message: string, messageType: string): 'audio' | 'texto' | null {
  const lower = message.toLowerCase();
  
  // Explicit audio patterns
  const audioPatterns = /[aá]udio|voz|ouvir|escutar|falar|falando/i;
  if (audioPatterns.test(lower)) return 'audio';
  
  // Explicit text patterns
  const textoPatterns = /texto|escrito|ler|mensagem|escrever|escrevendo|digitando/i;
  if (textoPatterns.test(lower)) return 'texto';
  
  // Fallback: infer from message type (rapport)
  // If user sent audio, they probably prefer audio
  if (messageType === 'audio') return 'audio';
  
  // If user sent text, they probably prefer text
  if (messageType === 'text') return 'texto';
  
  return null;
}

/**
 * Save communication preference to contact
 */
async function saveContactPreference(phoneNumber: string, preference: 'audio' | 'texto'): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({ 
      communication_preference: preference,
      updated_at: new Date().toISOString() 
    })
    .eq('phone', phoneNumber);
    
  if (error) {
    console.error('❌ Error saving contact preference:', error);
  } else {
    console.log(`✅ Contact preference saved: ${preference}`);
  }
}

/**
 * Send triage template triagem_ia (step 4 of new flow)
 */
async function sendTriageButtons(phoneNumber: string, config: AIAgentConfig, useAudio: boolean = false): Promise<void> {
  // Optional: send a brief intro before the template
  const introText = 'Agora me conta, como posso te ajudar hoje?';
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(introText, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, introText, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, introText);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, introText);
  }
  
  await sleep(500);
  
  // Send the triagem_ia template with buttons
  const { error } = await supabase.functions.invoke('send-wa-message', {
    body: { 
      to: phoneNumber, 
      template_name: 'triagem_ia',
      language_code: 'pt_BR'
    }
  });
  
  if (error) {
    console.error('❌ Error sending triage template:', error);
  } else {
    console.log('✅ Triage template triagem_ia sent');
  }
}

/**
 * Ask for name again if not detected
 */
async function askForNameAgain(phoneNumber: string, config: AIAgentConfig, useAudio: boolean = false): Promise<void> {
  const message = 'Me desculpa, não consegui entender seu nome 😅\n\nPode me dizer como posso te chamar?';
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(message, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, message, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, message);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, message);
  }
}

/**
 * Ask for preference again if not detected
 */
async function askForPreferenceAgain(phoneNumber: string, config: AIAgentConfig, useAudio: boolean = false): Promise<void> {
  const message = 'Desculpa, não entendi 😅\nVocê prefere receber por texto ou áudio?';
  
  if (useAudio && config.audio_enabled) {
    const audioResult = await generateAudio(message, config);
    if (audioResult) {
      await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, message, audioResult.isVoiceMessage);
    } else {
      await sendWhatsAppMessage(phoneNumber, message);
    }
  } else {
    await sendWhatsAppMessage(phoneNumber, message);
  }
}

/**
 * Save contact name to database and link to conversation
 */
async function saveContactName(phoneNumber: string, name: string): Promise<void> {
  // 1. Update contact name and get the contact ID
  const { data: contact, error } = await supabase
    .from('contacts')
    .update({ 
      name, 
      updated_at: new Date().toISOString() 
    })
    .eq('phone', phoneNumber)
    .select('id')
    .maybeSingle();
    
  if (error) {
    console.error('❌ Error saving contact name:', error);
    return;
  }
  
  if (!contact) {
    console.error('❌ Contact not found for phone:', phoneNumber);
    return;
  }
  
  console.log(`✅ Contact name saved: ${name} (id: ${contact.id})`);
  
  // 2. Link contact_id to conversation (if not already linked)
  const { error: convError } = await supabase
    .from('conversations')
    .update({ contact_id: contact.id })
    .eq('phone_number', phoneNumber)
    .is('contact_id', null);
    
  if (convError) {
    console.error('❌ Error linking contact to conversation:', convError);
  } else {
    console.log(`✅ Conversation linked to contact: ${contact.id}`);
  }
}

/**
 * Get contact's communication preference from database
 */
async function getContactPreference(phoneNumber: string): Promise<'audio' | 'texto' | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('communication_preference')
    .eq('phone', phoneNumber)
    .maybeSingle();
    
  if (error) {
    console.error('❌ Error getting contact preference:', error);
    return null;
  }
  
  return data?.communication_preference as 'audio' | 'texto' | null;
}

/**
 * Infer department from text message (fallback when buttons ignored)
 */
function inferDepartmentFromText(text: string): 'locacao' | 'vendas' | 'administrativo' | null {
  const lower = text.toLowerCase();
  
  // Locação patterns
  if (/alug|locar|loca[çc][aã]o|alugo/.test(lower)) return 'locacao';
  
  // Vendas patterns
  if (/compr|adquir|compra|vender|venda/.test(lower)) return 'vendas';
  
  // Administrativo patterns
  if (/cliente|inquilino|propriet[aá]rio|boleto|contrato|manuten[çc][aã]o|segunda via|pagamento/.test(lower)) return 'administrativo';
  
  return null;
}

/**
 * Resend triage buttons when user sends text instead of clicking
 */
async function resendTriageButtonsWithHint(phoneNumber: string, name?: string): Promise<void> {
  const nameGreeting = name ? `, ${name}` : '';
  
  // 1. Send hint message first
  await supabase.functions.invoke('send-wa-message', {
    body: { 
      to: phoneNumber, 
      text: `Desculpa${nameGreeting}, não entendi 😅\n\nPode clicar em uma das opções abaixo?`
    }
  });
  
  // 2. Small delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 3. Resend triagem_ia template
  const { error } = await supabase.functions.invoke('send-wa-message', {
    body: { 
      to: phoneNumber, 
      template_name: 'triagem_ia',
      language_code: 'pt_BR'
    }
  });
  
  if (error) {
    console.error('❌ Error resending triage template:', error);
  }
}

async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-wa-message', {
      body: { to, text }
    });
    return !error;
  } catch (e) {
    console.error('❌ Error sending WhatsApp message:', e);
    return false;
  }
}

async function sendWhatsAppAudio(to: string, audioUrl: string, audioText?: string, isVoiceMessage?: boolean): Promise<boolean> {
  try {
    // Use appropriate format based on whether it's a native voice message
    const mediaType = isVoiceMessage ? 'audio/ogg' : 'audio/mpeg';
    const filename = isVoiceMessage ? 'Mensagem de voz.ogg' : 'Mensagem de voz.mp3';
    
    const { error } = await supabase.functions.invoke('send-wa-media', {
      body: {
        to,
        mediaUrl: audioUrl,
        mediaType,
        filename,
        caption: '',
        body: audioText || '' // Save the text that was converted to audio for conversation context
      }
    });
    return !error;
  } catch (e) {
    console.error('❌ Error sending WhatsApp audio:', e);
    return false;
  }
}

async function sendWhatsAppImage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-wa-media', {
      body: {
        to,
        mediaUrl: imageUrl,
        mediaType: 'image/jpeg',
        caption: caption || ''
      }
    });
    return !error;
  } catch (e) {
    console.error('❌ Error sending WhatsApp image:', e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      phoneNumber, 
      messageBody, 
      messageType, 
      contactName, 
      contactType,
      // Triage context from webhook
      conversationId,
      currentDepartment,
      isPendingTriage
    } = await req.json();

    console.log('🤖 AI Virtual Agent triggered:', { 
      phoneNumber, 
      messageBody, 
      messageType,
      isPendingTriage,
      currentDepartment 
    });

    if (!phoneNumber || !messageBody) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing phoneNumber or messageBody' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ═══════════════════════════════════════════════════════════════
    // 🚫 OUT OF SCOPE DETECTION - Redirect locação/administrativo
    // ═══════════════════════════════════════════════════════════════
    // This channel (API Direta Meta) handles ONLY empreendimentos/vendas
    // Locação and Administrativo requests should go to 48 9 9163-1011
    
    const OUT_OF_SCOPE_PATTERNS_VA = {
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

    function detectOutOfScopeVA(msg: string): 'locacao' | 'administrativo' | null {
      const lower = msg.toLowerCase();
      
      for (const pattern of OUT_OF_SCOPE_PATTERNS_VA.locacao) {
        if (pattern.test(lower)) return 'locacao';
      }
      
      for (const pattern of OUT_OF_SCOPE_PATTERNS_VA.administrativo) {
        if (pattern.test(lower)) return 'administrativo';
      }
      
      return null;
    }

    const REDIRECT_MESSAGES_VA: Record<string, string> = {
      locacao: `Entendi que você busca um imóvel para alugar! 🏠

Para locação, nossa equipe especializada pode te ajudar melhor pelo número:
📱 *48 9 9163-1011*

Lá você vai ter atendimento completo para encontrar o imóvel ideal! 😊`,

      administrativo: `Entendi! Para questões administrativas como boletos, contratos ou manutenção, nosso time de suporte pode te ajudar:
📱 *48 9 9163-1011*

Eles vão resolver sua solicitação rapidinho! 😊`
    };

    // Check for out-of-scope requests BEFORE any processing
    // Only apply this check if NOT in triage flow (isPendingTriage handles its own routing)
    if (!isPendingTriage && !currentDepartment) {
      const outOfScopeVA = detectOutOfScopeVA(messageBody);
      if (outOfScopeVA) {
        console.log(`⚠️ Virtual Agent: Out of scope detected (${outOfScopeVA}) - Redirecting to 48 9 9163-1011`);
        
        const redirectMessageVA = REDIRECT_MESSAGES_VA[outOfScopeVA];
        
        // Send redirect message via WhatsApp
        await sendWhatsAppMessage(phoneNumber, redirectMessageVA);
        
        // Save redirect message to database
        await supabase.from('messages').insert({
          wa_to: phoneNumber,
          body: redirectMessageVA,
          direction: 'outbound',
          conversation_id: conversationId || null,
          created_at: new Date().toISOString()
        }).catch(console.error);
        
        // Log the redirect for metrics
        await supabase.from('activity_logs').insert({
          user_id: '00000000-0000-0000-0000-000000000000',
          action_type: 'ai_virtual_agent_redirect_out_of_scope',
          target_table: 'conversations',
          target_id: phoneNumber,
          metadata: {
            detected_scope: outOfScopeVA,
            message_preview: messageBody.substring(0, 100),
            redirected_to: '48 9 9163-1011',
            channel: 'api_direta_meta'
          }
        }).catch(console.error);
        
        return new Response(
          JSON.stringify({
            success: true,
            action: 'redirected_out_of_scope',
            scope_detected: outOfScopeVA,
            redirected_to: '48 9 9163-1011'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // ═══════════════════════════════════════════════════════════════

    // Load AI agent configuration from database
    let config = { ...defaultConfig };
    try {
      const { data: configData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_agent_config')
        .single();

      if (configData?.setting_value) {
        config = { ...defaultConfig, ...configData.setting_value as AIAgentConfig };
      }
    } catch (e) {
      console.log('Using default AI config');
    }

    // 🆕 Load department-specific AI configuration if department is assigned
    let departmentConfig: any = null;
    if (currentDepartment) {
      try {
        const { data: deptConfigData } = await supabase
          .from('ai_department_configs')
          .select('*')
          .eq('department_code', currentDepartment)
          .eq('is_active', true)
          .maybeSingle();

        if (deptConfigData) {
          departmentConfig = deptConfigData;
          console.log(`📋 Loaded department config for ${currentDepartment}:`, {
            agent_name: deptConfigData.agent_name,
            tone: deptConfigData.tone,
            has_custom_instructions: !!deptConfigData.custom_instructions
          });

          // Merge department config into main config
          config = {
            ...config,
            agent_name: deptConfigData.agent_name || config.agent_name,
            tone: deptConfigData.tone || config.tone,
            greeting_message: deptConfigData.greeting_message || config.greeting_message,
            custom_instructions: (config.custom_instructions || '') + '\n\n' + 
              `[INSTRUÇÕES DO DEPARTAMENTO ${currentDepartment.toUpperCase()}]\n` + 
              (deptConfigData.custom_instructions || ''),
            services: [
              ...(config.services || []),
              ...(Array.isArray(deptConfigData.services) ? deptConfigData.services : [])
            ],
            limitations: [
              ...(config.limitations || []),
              ...(Array.isArray(deptConfigData.limitations) ? deptConfigData.limitations : [])
            ]
          };
        }
      } catch (e) {
        console.log(`No department config for ${currentDepartment}, using global config`);
      }
    }

    // ========== TRIAGE FLOW HANDLING ==========
    // Determine if we should use audio based on message type (rapport/mirroring)
    const useAudioForTriage = messageType === 'audio' && config.audio_enabled;
    
    if (isPendingTriage) {
      console.log('📋 Handling triage flow for pending conversation');
      console.log(`🔊 Using audio for triage: ${useAudioForTriage} (messageType: ${messageType})`);
      
      // Get current triage stage
      const { data: convState } = await supabase
        .from('conversation_states')
        .select('triage_stage')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      let triageStage = convState?.triage_stage || null;
      console.log(`📍 Current triage stage: ${triageStage || 'none'}`);

      // ========== AUTO-HEAL: Reset stale "completed" stage if no department assigned ==========
      // This prevents loops where triage_stage is "completed" but conversation has no department
      if (triageStage === 'completed' && !currentDepartment) {
        console.log('⚠️ Auto-heal: triage_stage is "completed" but no department assigned. Resetting to "awaiting_triage".');
        triageStage = 'awaiting_triage';
        await updateTriageStage(phoneNumber, 'awaiting_triage');
        // Fall through to the awaiting_triage handler below
      }

      // STAGE: GREETING (first message - no stage yet)
      if (!triageStage || triageStage === 'greeting') {
        console.log('👋 Sending greeting (step 1)');
        await sendGreeting(phoneNumber, config, useAudioForTriage);
        
        console.log('❓ Asking for name (step 2)');
        await askForName(phoneNumber, config, useAudioForTriage);
        
        await updateTriageStage(phoneNumber, 'awaiting_name');
        
        return new Response(
          JSON.stringify({ success: true, action: 'greeting_sent' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // STAGE: AWAITING NAME
      if (triageStage === 'awaiting_name') {
        const detectedName = extractCustomerName(messageBody);
        
        if (detectedName) {
          console.log(`👤 Name detected: ${detectedName}`);
          
          // Save name to contacts
          await saveContactName(phoneNumber, detectedName);
          
          // Send preference question (step 3)
          await sendPreferenceQuestion(phoneNumber, detectedName, config, useAudioForTriage);
          await updateTriageStage(phoneNumber, 'awaiting_preference');
          
          return new Response(
            JSON.stringify({ success: true, action: 'preference_question_sent', name: detectedName }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('❓ Name not detected, asking again');
          await askForNameAgain(phoneNumber, config, useAudioForTriage);
          // Keep stage as awaiting_name
          
          return new Response(
            JSON.stringify({ success: true, action: 'asked_name_again' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // STAGE: AWAITING PREFERENCE (new stage)
      if (triageStage === 'awaiting_preference') {
        // Try to detect preference from message
        const preference = extractCommunicationPreference(messageBody, messageType);
        
        if (preference) {
          console.log(`📱 Preference detected: ${preference}`);
          
          // Save preference to contact
          await saveContactPreference(phoneNumber, preference);
          
          // Send triage template (step 4)
          const useAudioForTemplate = preference === 'audio' && config.audio_enabled;
          await sendTriageButtons(phoneNumber, config, useAudioForTemplate);
          await updateTriageStage(phoneNumber, 'awaiting_triage');
          
          return new Response(
            JSON.stringify({ success: true, action: 'triage_buttons_sent', preference }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('❓ Preference not detected, asking again');
          await askForPreferenceAgain(phoneNumber, config, useAudioForTriage);
          // Keep stage as awaiting_preference
          
          return new Response(
            JSON.stringify({ success: true, action: 'asked_preference_again' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // STAGE: AWAITING TRIAGE (user sent text instead of clicking button)
      if (triageStage === 'awaiting_triage') {
        // Try to infer department from text
        const inferredDept = inferDepartmentFromText(messageBody);
        
        if (inferredDept) {
          console.log(`🎯 Inferred department from text: ${inferredDept}`);
          
          // Return the inferred department for webhook to assign
          return new Response(
            JSON.stringify({ 
              success: true, 
              action: 'department_inferred',
              assignedDepartment: inferredDept 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Could not infer, resend buttons
          const { data: contact } = await supabase
            .from('contacts')
            .select('name')
            .eq('phone', phoneNumber)
            .maybeSingle();
            
          console.log('❓ Could not infer department, resending buttons');
          await resendTriageButtonsWithHint(phoneNumber, contact?.name);
          
          return new Response(
            JSON.stringify({ success: true, action: 'triage_buttons_resent' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    // ========== END TRIAGE FLOW ==========

    // ========== PORTAL LEAD QUALIFICATION CHECK ==========
    // Check if this is a portal lead and handle with qualification flow
    const behaviorConfig = await getAIBehaviorConfig();
    const portalCheck = await isPortalLead(phoneNumber);
    
    if (portalCheck.isPortal && behaviorConfig) {
      console.log('📍 Portal lead detected!', {
        portal: portalCheck.portalData?.portal_origin,
        qualificationId: portalCheck.qualificationId,
        currentScore: portalCheck.qualificationData?.qualification_score
      });
      
      // Only use qualification flow if not already sent to CRM or disqualified
      const qualStatus = portalCheck.qualificationData?.qualification_status;
      if (!qualStatus || ['pending', 'qualifying'].includes(qualStatus)) {
        return handlePortalLeadQualification(
          phoneNumber,
          messageBody,
          messageType,
          contactName,
          portalCheck,
          behaviorConfig,
          config
        );
      } else {
        console.log(`📋 Portal lead already processed (status: ${qualStatus}), continuing normal flow`);
      }
    }
    // ========== END PORTAL LEAD QUALIFICATION CHECK ==========

    // ========== REFERENCE TO EARLIER PROPERTY ==========
    // Check if user is referencing a property they sent earlier
    if (referencesEarlierProperty(messageBody)) {
      console.log('🔍 User references earlier property, searching message history...');
      
      // Find the first property link in the conversation history
      const { data: previousMessages } = await supabase
        .from('messages')
        .select('body, created_at')
        .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`)
        .ilike('body', '%smolkaimoveis.com.br/imovel%')
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (previousMessages?.[0]?.body) {
        const earlierCode = extractPropertyCodeFromUrl(previousMessages[0].body);
        
        if (earlierCode) {
          console.log(`🔗 Found earlier property code in history: ${earlierCode}`);
          const property = await getPropertyByListingId(earlierCode);
          
          if (property) {
            const { data: contactData } = await supabase
              .from('contacts')
              .select('name')
              .eq('phone', phoneNumber)
              .maybeSingle();
            
            const customerName = contactData?.name || contactName;
            
            await sendWhatsAppMessage(phoneNumber, `Achei o imóvel que você tinha me mandado! 😊`);
            await sleep(1200);
            
            const photoUrl = property.foto_destaque || property.FotoDestaque;
            if (photoUrl) {
              await sendWhatsAppImage(phoneNumber, photoUrl);
              await sleep(1200);
            }
            
            const propertyDetails = formatPropertyDetailsLikeLais(property, 'site');
            await sendWhatsAppMessage(phoneNumber, propertyDetails);
            await sleep(1500);
            
            await sendWhatsAppMessage(phoneNumber, `Quer agendar uma visita${customerName ? `, ${customerName}` : ''}? 😊`);
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                action: 'earlier_property_found',
                propertyCode: earlierCode
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      
      console.log('⚠️ Could not find earlier property, continuing normal flow');
    }
    // ========== END REFERENCE TO EARLIER PROPERTY ==========

    // ========== PROPERTY LINK PROCESSING ==========
    // Check if the message contains a property link and extract the code
    if (containsPropertyUrl(messageBody)) {
      const extractedPropertyCode = extractPropertyCodeFromUrl(messageBody);
      
      if (extractedPropertyCode) {
        console.log(`🔗 Property link detected! Code: ${extractedPropertyCode}`);
        
        // Fetch property details from Vista
        const property = await getPropertyByListingId(extractedPropertyCode);
        
        if (property) {
          console.log(`✅ Property found for code ${extractedPropertyCode}:`, property);
          
          // Get contact name if available
          const { data: contactData } = await supabase
            .from('contacts')
            .select('name')
            .eq('phone', phoneNumber)
            .maybeSingle();
          
          const customerName = contactData?.name || contactName;
          
          // Determine finalidade from property
          const isRental = property.status === 'ALUGUEL' || 
                           property.Situacao === 'ALUGUEL' ||
                           (property.valor_locacao && !property.valor_venda) ||
                           (property.ValorLocacao && !property.ValorVenda);
          const finalidade = isRental ? 'locacao' : 'venda';
          
          // Send greeting
          const greetingMsg = customerName 
            ? `Oi, ${customerName}! Aqui é a ${config.agent_name} da ${config.company_name} 🏠`
            : `Olá! Aqui é a ${config.agent_name} da ${config.company_name} 🏠`;
          await sendWhatsAppMessage(phoneNumber, greetingMsg);
          await sleep(1200);
          
          // Interest confirmation
          await sendWhatsAppMessage(phoneNumber, `Vi que você se interessou por esse imóvel! 😊`);
          await sleep(1500);
          
          // Send property photo if available
          const photoUrl = property.foto_destaque || property.FotoDestaque;
          if (photoUrl) {
            await sendWhatsAppImage(phoneNumber, photoUrl);
            await sleep(1200);
          }
          
          // Send formatted property details
          const propertyDetails = formatPropertyDetailsLikeLais(property, 'site');
          await sendWhatsAppMessage(phoneNumber, propertyDetails);
          await sleep(1500);
          
          // Consultive follow-up
          await sendWhatsAppMessage(phoneNumber, `Esse imóvel combina com o que você busca? Posso agendar uma visita pra você conhecer! 😊`);
          
          // Save property context to conversation_states for future reference
          const propertyContext = {
            tipo: property.categoria?.toLowerCase() || property.Categoria?.toLowerCase() || 'imovel',
            finalidade: finalidade,
            bairro: property.bairro || property.Bairro,
            quartos: property.dormitorios || property.Dormitorios,
            preco_referencia: isRental 
              ? (property.valor_locacao || property.ValorLocacao)
              : (property.valor_venda || property.ValorVenda),
            codigo_referencia: extractedPropertyCode
          };
          
          console.log(`💾 Saving property context:`, propertyContext);
          
          // Update conversation state with property context
          await supabase
            .from('conversation_states')
            .upsert({
              phone_number: phoneNumber,
              is_ai_active: true,
              last_ai_message_at: new Date().toISOString(),
              last_search_params: propertyContext,
              updated_at: new Date().toISOString()
            }, { onConflict: 'phone_number' });
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              action: 'property_link_processed',
              propertyCode: extractedPropertyCode,
              propertyFound: true,
              context: propertyContext
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log(`⚠️ Property not found for code ${extractedPropertyCode}`);
          
          // Fallback: property not found, ask for confirmation
          const { data: contactData } = await supabase
            .from('contacts')
            .select('name')
            .eq('phone', phoneNumber)
            .maybeSingle();
          
          const customerName = contactData?.name || contactName;
          
          await sendWhatsAppMessage(phoneNumber, 
            `Hmm, não encontrei esse imóvel no sistema 🤔\n\n` +
            `Pode me confirmar o código ${extractedPropertyCode}${customerName ? `, ${customerName}` : ''}? ` +
            `Ou se preferir, me conta mais sobre o que você busca que eu procuro opções similares! 😊`
          );
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              action: 'property_not_found_asked_code',
              extractedCode: extractedPropertyCode
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        console.log(`⚠️ Could not extract property code from URL`);
        
        // Fallback: couldn't extract code, ask for it
        const urlInfo = extractInfoFromUrlText(messageBody);
        console.log(`📋 Extracted URL info:`, urlInfo);
        
        const { data: contactData } = await supabase
          .from('contacts')
          .select('name')
          .eq('phone', phoneNumber)
          .maybeSingle();
        
        const customerName = contactData?.name || contactName;
        
        let contextHint = '';
        if (urlInfo.tipo && urlInfo.bairro) {
          contextHint = `Vi que você se interessou por um ${urlInfo.tipo} em ${urlInfo.bairro}! `;
        } else if (urlInfo.tipo) {
          contextHint = `Vi que você se interessou por um ${urlInfo.tipo}! `;
        } else if (urlInfo.bairro) {
          contextHint = `Vi que você se interessou por um imóvel em ${urlInfo.bairro}! `;
        }
        
        await sendWhatsAppMessage(phoneNumber, 
          `${contextHint}Me passa o código do imóvel${customerName ? `, ${customerName}` : ''}? ` +
          `São os números no final do link! 😊`
        );
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            action: 'asked_property_code',
            extractedInfo: urlInfo
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // ========== END PROPERTY LINK PROCESSING ==========

    // ========== PENDING PROPERTIES & NEGOTIATION LOGIC ==========
    // Check if user wants to see another property option
    const wantsNextOption = /outra|outro|mais|diferente|n[aã]o gostei|n[aã]o curti|pr[oó]xim[oa]|seguinte|tem mais|outras?/i.test(messageBody);
    
    if (wantsNextOption) {
      console.log('🔄 User wants another option, checking pending properties...');
      
      // Get current state including pending properties
      const { data: convState } = await supabase
        .from('conversation_states')
        .select('pending_properties, last_search_params, negotiation_pending, suggested_price_max')
        .eq('phone_number', phoneNumber)
        .maybeSingle();
      
      const pendingProperties = (convState?.pending_properties as any[]) || [];
      const lastSearchParams = convState?.last_search_params as any;
      const negotiationPending = convState?.negotiation_pending || false;
      const suggestedPriceMax = convState?.suggested_price_max;
      
      console.log(`📦 Pending properties: ${pendingProperties.length}, Negotiation pending: ${negotiationPending}`);
      
      // CASE 0: Portal lead with no pending properties - search for similar properties
      if (pendingProperties.length === 0 && !lastSearchParams) {
        // Check if this is a portal lead
        const portalCheckForNext = await isPortalLead(phoneNumber);
        
        if (portalCheckForNext.isPortal && portalCheckForNext.portalData) {
          console.log('🔍 Portal lead wants alternative, searching for similar properties...');
          
          const portalData = portalCheckForNext.portalData;
          const originalListingId = portalData.origin_listing_id || portalData.client_listing_id;
          
          // Get original property info to search for similar ones
          const { data: originalProperty } = await supabase.functions.invoke('vista-get-property', {
            body: { codigo: originalListingId }
          });
          
          if (originalProperty?.success && originalProperty?.property) {
            const prop = originalProperty.property;
            const isRental = portalData.transaction_type === 'RENT';
            const originalPrice = isRental ? prop.valor_locacao : prop.valor_venda;
            
            // Build search params for similar properties
            const similarSearchParams = {
              tipo: prop.categoria?.toLowerCase()?.includes('apartamento') ? 'apartamento' :
                    prop.categoria?.toLowerCase()?.includes('casa') ? 'casa' :
                    prop.categoria?.toLowerCase()?.includes('terreno') ? 'terreno' : undefined,
              bairro: prop.bairro,
              finalidade: isRental ? 'locacao' : 'venda',
              preco_min: originalPrice ? Math.floor(originalPrice * 0.7) : undefined,
              preco_max: originalPrice ? Math.ceil(originalPrice * 1.3) : undefined,
              exclude_codigo: originalListingId // Exclude the original property
            };
            
            console.log('🔍 Searching similar properties with params:', similarSearchParams);
            
            const searchResult = await searchProperties(similarSearchParams);
            
            if (searchResult.success && searchResult.properties.length > 0) {
              // Filter out the original property just in case
              const alternatives = searchResult.properties.filter(
                (p: any) => p.codigo !== originalListingId
              );
              
              if (alternatives.length > 0) {
                const nextProperty = alternatives[0];
                const remainingProperties = alternatives.slice(1);
                
                // Send intro message
                await sendWhatsAppMessage(phoneNumber, "Olha essa outra opção que separei pra você! 🏠");
                await sleep(1500);
                
                // Send photo if available
                if (nextProperty.foto_destaque) {
                  await sendWhatsAppImage(phoneNumber, nextProperty.foto_destaque);
                  await sleep(1000);
                }
                
                // Send property details
                const propertyText = formatPropertyMessage(nextProperty);
                await sendWhatsAppMessage(phoneNumber, propertyText);
                await sleep(1500);
                await sendWhatsAppMessage(phoneNumber, "Faz mais sentido pra você? 😊");
                
                // Save remaining properties and search params
                const stateData: any = {
                  phone_number: phoneNumber,
                  pending_properties: remainingProperties,
                  last_search_params: similarSearchParams,
                  updated_at: new Date().toISOString()
                };
                
                await supabase
                  .from('conversation_states')
                  .upsert(stateData, { onConflict: 'phone_number' });
                
                return new Response(
                  JSON.stringify({ 
                    success: true, 
                    action: 'portal_alternative_shown', 
                    remaining: remainingProperties.length 
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            }
            
            // No alternatives found - ask what they didn't like
            console.log('❌ No similar properties found for portal lead');
            await sendWhatsAppMessage(phoneNumber, 
              "Entendi que você quer algo diferente! 😊\n\n" +
              "Me conta: o que não te agradou nesse? Assim posso buscar algo mais alinhado com o que você procura!"
            );
            
            return new Response(
              JSON.stringify({ success: true, action: 'asked_for_preferences' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
      }
      
      // CASE 1: User accepting price negotiation
      if (negotiationPending && /sim|pode|ok|beleza|vamos|t[aá]|fechado|aceito|bora|vamo/i.test(messageBody)) {
        console.log('💰 User accepted higher price, searching with new limit...');
        
        const newParams = {
          ...lastSearchParams,
          preco_max: suggestedPriceMax
        };
        
        const searchResult = await searchProperties(newParams);
        
        if (searchResult.success && searchResult.properties.length > 0) {
          // Show first property from new search
          const property = searchResult.properties[0];
          const remainingProperties = searchResult.properties.slice(1);
          
          // Send intro message
          await sendWhatsAppMessage(phoneNumber, `Boa! Achei mais opções até R$ ${suggestedPriceMax?.toLocaleString('pt-BR')}/mês! 🏠`);
          await sleep(1500);
          
          // Send photo if available
          if (property.foto_destaque) {
            await sendWhatsAppImage(phoneNumber, property.foto_destaque);
            await sleep(1000);
          }
          
          // Send property details
          const propertyText = formatPropertyMessage(property);
          await sendWhatsAppMessage(phoneNumber, propertyText);
          await sleep(1500);
          await sendWhatsAppMessage(phoneNumber, "Faz sentido pra você? 😊");
          
          // Update state with new pending properties and new search params
          await supabase
            .from('conversation_states')
            .update({
              pending_properties: remainingProperties,
              last_search_params: newParams,
              negotiation_pending: false,
              suggested_price_max: null,
              updated_at: new Date().toISOString()
            })
            .eq('phone_number', phoneNumber);
          
          return new Response(
            JSON.stringify({ success: true, action: 'negotiation_accepted', propertiesFound: searchResult.properties.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // No properties even with higher price
          await sendWhatsAppMessage(phoneNumber, `Infelizmente não encontrei opções mesmo até R$ ${suggestedPriceMax?.toLocaleString('pt-BR')}/mês 😔\nQuer ajustar outros critérios como bairro ou tipo de imóvel?`);
          
          await supabase
            .from('conversation_states')
            .update({ negotiation_pending: false, suggested_price_max: null, updated_at: new Date().toISOString() })
            .eq('phone_number', phoneNumber);
          
          return new Response(
            JSON.stringify({ success: true, action: 'no_properties_found_negotiation' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
      
      // CASE 2: Has pending properties - show next one
      if (pendingProperties.length > 0) {
        console.log(`📸 Showing next property from ${pendingProperties.length} pending`);
        
        const property = pendingProperties[0];
        const remainingProperties = pendingProperties.slice(1);
        
        // Send intro message
        await sendWhatsAppMessage(phoneNumber, "Olha essa outra opção! 🏠");
        await sleep(1500);
        
        // Send photo if available
        if (property.foto_destaque) {
          await sendWhatsAppImage(phoneNumber, property.foto_destaque);
          await sleep(1000);
        }
        
        // Send property details
        const propertyText = formatPropertyMessage(property);
        await sendWhatsAppMessage(phoneNumber, propertyText);
        await sleep(1500);
        await sendWhatsAppMessage(phoneNumber, "Faz sentido pra você? 😊");
        
        // Update pending properties
        await supabase
          .from('conversation_states')
          .update({
            pending_properties: remainingProperties,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number', phoneNumber);
        
        return new Response(
          JSON.stringify({ success: true, action: 'showed_next_property', remaining: remainingProperties.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // CASE 3: No pending properties and has search params - offer to increase price
      if (lastSearchParams && lastSearchParams.preco_max) {
        const currentMax = lastSearchParams.preco_max;
        const suggestedMax = currentMax + 1000;
        
        console.log(`💰 No more properties, starting negotiation: ${currentMax} → ${suggestedMax}`);
        
        await sendWhatsAppMessage(phoneNumber, 
          `Infelizmente não tenho mais opções até R$ ${currentMax.toLocaleString('pt-BR')}/mês 😔\n\n` +
          `Mas se você puder aumentar um pouquinho, até R$ ${suggestedMax.toLocaleString('pt-BR')}/mês, posso buscar mais opções. O que acha?`
        );
        
        // Save negotiation state
        await supabase
          .from('conversation_states')
          .update({
            negotiation_pending: true,
            suggested_price_max: suggestedMax,
            updated_at: new Date().toISOString()
          })
          .eq('phone_number', phoneNumber);
        
        return new Response(
          JSON.stringify({ success: true, action: 'price_negotiation_started', currentMax, suggestedMax }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // CASE 4: No pending, no search params - let AI handle naturally
      console.log('❓ No pending properties or search params, letting AI handle...');
    }
    // ========== END PENDING PROPERTIES & NEGOTIATION ==========

    // Config already loaded above, add verbose logging for normal flow
    console.log('📋 Using AI config for normal flow:', { 
      provider: config.ai_provider, 
      model: config.ai_model,
      humanize: config.humanize_responses,
      rapport: config.rapport_enabled,
      triggers: config.triggers_enabled,
      spin: config.spin_enabled,
      hasKnowledgeBase: !!config.knowledge_base_content,
      objectionsCount: config.objections?.length || 0,
      vistaEnabled: config.vista_integration_enabled !== false
    });

    // Get conversation history for context - PHASE 2: Use conversationId for isolation
    const historyLimit = config.max_history_messages || 5;
    let recentMessages: any[] | null = null;
    
    // Prefer conversation_id if available (isolates history between departments)
    if (conversationId) {
      console.log(`📜 Loading history by conversationId: ${conversationId}`);
      const { data } = await supabase
        .from('messages')
        .select('body, direction, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(historyLimit);
      recentMessages = data;
    } else {
      // Fallback to phone-based history (legacy)
      console.log(`📜 Loading history by phone (legacy): ${phoneNumber}`);
      const { data } = await supabase
        .from('messages')
        .select('body, direction, created_at')
        .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`)
        .order('created_at', { ascending: false })
        .limit(historyLimit);
      recentMessages = data;
    }

    // Patterns to exclude from history (contaminated generic responses)
    const CONTAMINATED_PATTERNS = [
      // Menus e opções genéricas
      /→/,  // Menu options with arrows
      /responda só com um número/i,
      /1\s*→.*2\s*→.*3\s*→/i,
      
      // Sites concorrentes
      /quintoandar/i,
      /zap\s*im[oó]veis/i,
      /vivareal/i,
      /imovelweb/i,
      /olx/i,
      
      // Templates para terceiros
      /copie?\s*(e|para)\s*(adapte|enviar|mandar)/i,
      /copiar e mandar/i,
      /mensagem\s+(para|pra)\s+(você\s+)?(usar|enviar|mandar)/i,
      /texto\s+(para|pra)\s+enviar/i,
      /vi\s+o\s+an[uú]ncio\s+do\s+im[oó]vel/i,
      
      // Perguntas genéricas
      /cidade\s*\/\s*estado/i,
      /qual\s+(cidade|estado)/i,
      /filtros?\s+(nos?|em)\s+sites?/i,
      /apps?\s+como/i,
      
      // Passos didáticos
      /passo\s+a\s+passo/i,
      /o\s+que\s+perguntar\s+ao?\s+propriet[aá]rio/i,
      /na\s+visita[,:]?\s*(para|você)/i,
      /pontos?\s+importantes?\s+em\s+im[oó]veis?/i,
      
      // Assistente genérico
      /quero ajuda para estudar/i,
      /quero ajuda com trabalho/i,
      /quero ajuda com dinheiro/i,
      /quero só conversar/i,
      /mensagem curtinha para você/i,
      /mudar de assunto/i,
      /ajuda com.*emprego/i,
      /organização financeira/i,
    ];

    // Build conversation context, filtering out contaminated messages
    const conversationHistory = recentMessages?.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body || ''
    })).filter(msg => {
      if (!msg.content) return false;
      // If it's an assistant message, check for contamination
      if (msg.role === 'assistant') {
        const isContaminated = CONTAMINATED_PATTERNS.some(pattern => pattern.test(msg.content));
        if (isContaminated) {
          console.log('🧹 Filtered contaminated message:', msg.content.substring(0, 50) + '...');
          return false;
        }
      }
      return true;
    }) || [];

    // ========== NAME DETECTION AND SAVING ==========
    let currentContactName = contactName;
    
    // Check if we should try to extract a name from the current message
    if (!currentContactName && config.rapport_use_name && conversationHistory.length >= 2) {
      // Find the last assistant message
      const lastAssistantMessage = conversationHistory.filter(m => m.role === 'assistant').pop();
      
      // Check if the last assistant message asked for the name
      if (lastAssistantMessage && didAskForName(lastAssistantMessage.content)) {
        const detectedName = extractCustomerName(messageBody);
        if (detectedName) {
          console.log(`👤 Nome detectado na mensagem: "${detectedName}"`);
          
          // Save name to database
          const { error: updateError } = await supabase
            .from('contacts')
            .update({ 
              name: detectedName, 
              updated_at: new Date().toISOString() 
            })
            .eq('phone', phoneNumber);
          
          if (updateError) {
            console.error('❌ Error saving name to contacts:', updateError);
          } else {
            console.log(`✅ Nome "${detectedName}" salvo no banco para ${phoneNumber}`);
            currentContactName = detectedName;
          }
        }
      }
    }

    conversationHistory.push({
      role: 'user',
      content: messageBody
    });

    // Build dynamic system prompt with all new features (using potentially updated name)
    const systemPrompt = buildSystemPrompt(config, currentContactName, contactType);

    // Determine expected response mode BEFORE calling AI to set appropriate max_tokens
    let expectedMode: 'text' | 'audio' = 'text';
    if (config.audio_channel_mirroring && config.audio_enabled) {
      expectedMode = messageType === 'audio' ? 'audio' : 'text';
    } else if (config.audio_enabled && config.audio_mode === 'audio_only') {
      expectedMode = 'audio';
    }

    // Dynamic max_tokens based on response mode
    const dynamicMaxTokens = expectedMode === 'audio' 
      ? Math.ceil((config.audio_max_chars || 400) / 2.5)
      : Math.min(config.max_tokens || 200, 200);

    const estimatedTokens = Math.ceil((systemPrompt.length + conversationHistory.reduce((acc, m) => acc + m.content.length, 0)) / 4);
    console.log('📊 Token estimation:', {
      provider: config.ai_provider,
      model: config.ai_model,
      historyMessages: conversationHistory.length,
      estimatedInputTokens: estimatedTokens,
      expectedMode,
      dynamicMaxTokens,
      promptLength: systemPrompt.length,
      contactName: currentContactName || '(não identificado)'
    });

    // Create a modified config with dynamic max_tokens
    const aiConfig = { ...config, max_tokens: dynamicMaxTokens };

    // Call AI with tool support
    let aiResult = await callAIWithTools(aiConfig, [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ], config.vista_integration_enabled !== false);

    let aiMessage = aiResult.content;
    let propertiesToSend: any[] = [];

    // Process tool calls if any
    if (aiResult.toolCalls && aiResult.toolCalls.length > 0) {
      console.log('🔧 Processing tool calls:', aiResult.toolCalls.length);
      
      for (const toolCall of aiResult.toolCalls) {
        if (toolCall.function.name === 'buscar_imoveis') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('🏠 Tool call: buscar_imoveis with args:', args);
          
          const searchResult = await searchProperties(args);
          
          if (searchResult.success && searchResult.properties.length > 0) {
            propertiesToSend = searchResult.properties;
            console.log(`✅ Found ${propertiesToSend.length} properties to present`);
            
            // Save search params for future negotiation
            console.log(`💾 Saving search params for negotiation:`, args);
            await supabase
              .from('conversation_states')
              .upsert({
                phone_number: phoneNumber,
                last_search_params: args,
                negotiation_pending: false,
                suggested_price_max: null,
                updated_at: new Date().toISOString()
              }, { onConflict: 'phone_number' });
          }
          
          // Call AI again with tool results to get proper response
          // Add explicit instruction to NOT include property details in response
          const postToolInstruction = `INSTRUÇÕES PÓS-BUSCA (CRÍTICO):
Os imóveis encontrados serão enviados AUTOMATICAMENTE pelo sistema com foto e detalhes formatados.
NÃO inclua nenhuma informação sobre imóveis na sua resposta.
NÃO use markdown de imagem.
NÃO inclua URLs ou links.
NÃO liste características como quartos, área, preço.
Responda APENAS com uma frase curta de introdução (máximo 15 palavras) como:
- "Achei uma opção boa pra você!"
- "Vou te mostrar um que costuma agradar!"`;

          const toolResultMessages = [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { 
              role: 'assistant', 
              content: aiResult.content || null,
              tool_calls: aiResult.toolCalls 
            },
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(searchResult)
            },
            {
              role: 'system',
              content: postToolInstruction
            }
          ];

          // Get AI's response after seeing tool results
          const followUpResult = await callAIWithTools(aiConfig, toolResultMessages, false);
          aiMessage = sanitizeAIMessage(followUpResult.content);
        }
        
        // Handle C2S lead sending tool
        if (toolCall.function.name === 'enviar_lead_c2s') {
          const args = JSON.parse(toolCall.function.arguments);
          console.log('🏢 Tool call: enviar_lead_c2s with args:', args);
          
          // Build conversation history string for C2S
          const historyText = conversationHistory
            .slice(-10)
            .map(m => `[${m.role === 'user' ? 'Cliente' : 'Agente'}]: ${m.content}`)
            .join('\n');
          
          const c2sResult = await sendLeadToC2S(args, phoneNumber, historyText, currentContactName);
          
          if (c2sResult.success) {
            console.log(`✅ Lead sent to C2S! ID: ${c2sResult.c2s_lead_id}`);
            
            // Set handoff message
            aiMessage = `Perfeito${currentContactName ? `, ${currentContactName}` : ''}! Vou te passar para um de nossos corretores especializados em vendas 🏡\n\nEle vai entrar em contato pelo WhatsApp em breve! 😊`;
            
            // Update conversation state to indicate handoff
            await supabase
              .from('conversation_states')
              .upsert({
                phone_number: phoneNumber,
                is_ai_active: false,
                operator_takeover_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'phone_number' });
              
            console.log('🔄 Conversation handed off to C2S/human');
          } else {
            console.error('❌ Failed to send to C2S:', c2sResult.error);
            aiMessage = `Entendi seu interesse${currentContactName ? `, ${currentContactName}` : ''}! Vou anotar seus critérios e um de nossos corretores especializados em vendas vai entrar em contato com você 😊`;
          }
        }
      }
    }

    if (!aiMessage && propertiesToSend.length === 0) {
      throw new Error('No response from AI');
    }

    // Validate AI response for forbidden content
    const validation = validateAIResponse(aiMessage || '');
    if (!validation.valid) {
      console.log(`🚫 AI response rejected: ${validation.reason}`);
      console.log(`📝 Original response: ${aiMessage?.substring(0, 200)}`);
      aiMessage = FALLBACK_RESPONSE;
      console.log(`✅ Using fallback response instead`);
    }

    // ========== ANTI-LOOP SYSTEM ==========
    // Check if AI is repeating questions already answered
    const qualDataForLoop = await getQualificationDataForAntiLoop(phoneNumber);
    
    if (aiMessage && isLoopingQuestion(aiMessage, qualDataForLoop)) {
      console.log('🔄 [ANTI-LOOP] Replacing looping question with next logical step');
      const nextQuestion = getNextLogicalQuestion(qualDataForLoop);
      
      // If all data collected, trigger property search
      if (nextQuestion.includes('Vou buscar')) {
        console.log('🏠 [ANTI-LOOP] All data collected, should trigger search');
        // The search will be handled by the tool call flow
      }
      
      aiMessage = nextQuestion;
    }
    
    // Check for exact message repetition
    if (aiMessage && isRepetitiveMessage(phoneNumber, aiMessage)) {
      console.log('🔄 [ANTI-LOOP] Replacing repetitive message');
      aiMessage = getNextLogicalQuestion(qualDataForLoop);
    }
    // ========== END ANTI-LOOP SYSTEM ==========

    console.log('✅ AI response (validated + anti-loop):', aiMessage?.substring(0, 100));

    // Process and send messages
    let messagesSent = 0;
    
    // Determine response mode based on channel mirroring or saved preference
    let responseMode: 'text' | 'audio' = 'text';
    
    if (config.audio_channel_mirroring && config.audio_enabled) {
      // Priority 1: Channel mirroring - respond in same format as customer
      responseMode = messageType === 'audio' ? 'audio' : 'text';
      console.log(`🔄 Channel mirroring: customer sent ${messageType} → responding with ${responseMode}`);
    } else if (config.audio_enabled) {
      // Priority 2: Check saved communication preference
      const savedPreference = await getContactPreference(phoneNumber);
      if (savedPreference) {
        responseMode = savedPreference === 'audio' ? 'audio' : 'text';
        console.log(`📱 Using saved preference: ${savedPreference} → responding with ${responseMode}`);
      } else {
        // Priority 3: Fall back to audio_mode config
        responseMode = config.audio_mode === 'audio_only' ? 'audio' : 'text';
        console.log(`⚙️ Using config audio_mode: ${config.audio_mode} → responding with ${responseMode}`);
      }
    }
    
    // Send text response first (if any)
    if (aiMessage && responseMode === 'text') {
      if (config.fragment_long_messages && config.humanize_responses) {
        let fragments = fragmentMessage(aiMessage, 100);
        
        // LIMIT: máximo de 4 fragmentos para evitar "metralhadora de mensagens"
        const MAX_FRAGMENTS = 4;
        if (fragments.length > MAX_FRAGMENTS) {
          console.log(`⚠️ Limiting fragments from ${fragments.length} to ${MAX_FRAGMENTS}`);
          fragments = fragments.slice(0, MAX_FRAGMENTS);
        }
        
        console.log(`📝 Text mode: fragmented into ${fragments.length} parts (100 chars max, max ${MAX_FRAGMENTS})`);
        
        for (let i = 0; i < fragments.length; i++) {
          const fragment = fragments[i];
          await sendWhatsAppMessage(phoneNumber, fragment);
          messagesSent++;
          
          if (i < fragments.length - 1 || propertiesToSend.length > 0) {
            const delay = config.message_delay_ms || 2000;
            const variation = Math.random() * 1000 - 500;
            await sleep(Math.max(1000, delay + variation));
          }
        }
      } else if (aiMessage) {
        await sendWhatsAppMessage(phoneNumber, aiMessage);
        messagesSent++;
      }
    } else if (aiMessage && responseMode === 'audio') {
      const maxChars = config.audio_max_chars || 400;
      let audioText = aiMessage;
      if (audioText.length > maxChars) {
        const truncated = audioText.substring(0, maxChars);
        const lastSentence = truncated.lastIndexOf('.');
        if (lastSentence > maxChars * 0.6) {
          audioText = truncated.substring(0, lastSentence + 1);
        } else {
          audioText = truncated + '...';
        }
      }
      
      console.log(`🎙️ Audio mode: sending complete audio (${audioText.length} chars)`);
      const audioResult = await generateAudio(audioText, config);
      if (audioResult) {
        await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, audioText, audioResult.isVoiceMessage);
        messagesSent++;
      } else {
        await sendWhatsAppMessage(phoneNumber, aiMessage);
        messagesSent++;
      }
    }

    // Send property photos and details - ONLY 1 property at a time
    if (propertiesToSend.length > 0) {
      console.log(`📸 Sending 1 property (${propertiesToSend.length} found total)`);
      
      // Only send the first property
      const property = propertiesToSend[0];
      
      // Send photo if available
      if (property.foto_destaque) {
        await sleep(1500);
        await sendWhatsAppImage(phoneNumber, property.foto_destaque);
        messagesSent++;
      }
      
      // Send property details
      await sleep(1000);
      const propertyText = formatPropertyMessage(property);
      await sendWhatsAppMessage(phoneNumber, propertyText);
      messagesSent++;
      
      // Store remaining properties for future interactions
      if (propertiesToSend.length > 1) {
        const remainingProperties = propertiesToSend.slice(1);
        console.log(`💾 Storing ${remainingProperties.length} remaining properties for later`);
        
        const pendingState: any = {
          phone_number: phoneNumber,
          pending_properties: remainingProperties,
          updated_at: new Date().toISOString()
        };
        
        await supabase
          .from('conversation_states')
          .upsert(pendingState, { onConflict: 'phone_number' });
      }
      
      // Ask confirmation question
      await sleep(1500);
      await sendWhatsAppMessage(phoneNumber, "Faz sentido pra você? 😊");
      messagesSent++;
    }

    // If NOT mirroring, also send audio based on audio_mode
    if (!config.audio_channel_mirroring && config.audio_enabled && config.audio_mode === 'text_and_audio' && aiMessage) {
      const audioResult = await generateAudio(aiMessage, config);
      if (audioResult) {
        await sendWhatsAppAudio(phoneNumber, audioResult.audioUrl, aiMessage, audioResult.isVoiceMessage);
        messagesSent++;
      }
    }

    console.log(`📱 ${messagesSent} WhatsApp message(s) sent`);

    // Update conversation state - PHASE 2: Include conversation_id for future isolation
    const stateUpdate: any = {
      phone_number: phoneNumber,
      is_ai_active: true,
      last_ai_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await supabase
      .from('conversation_states')
      .upsert(stateUpdate, { onConflict: 'phone_number' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiMessage,
        messagesSent,
        propertiesFound: propertiesToSend.length,
        provider: config.ai_provider,
        model: config.ai_model
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ AI Virtual Agent error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
