import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
            description: "Nome do bairro ou região desejada (ex: Trindade, Centro, Ingleses, Campeche, Lagoa da Conceição)"
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
            description: "Número mínimo de dormitórios desejados"
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
  }
];

function buildSystemPrompt(config: AIAgentConfig, contactName?: string, contactType?: string): string {
  let prompt = `Você é ${config.agent_name} da ${config.company_name}.

PERSONALIDADE E TOM:
- ${toneDescriptions[config.tone] || 'Formal e profissional'}
- Cordial e objetivo nas respostas
- Empático com as necessidades dos clientes

SOBRE A EMPRESA:
${config.company_description}`;

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

  prompt += `\n\nSERVIÇOS OFERECIDOS:
${config.services.map(s => `• ${s}`).join('\n')}`;

  // Vista CRM Integration - Property Search Instructions
  if (config.vista_integration_enabled !== false) {
    prompt += `\n\n🏠 BUSCA DE IMÓVEIS (FUNÇÃO CRÍTICA):
Você tem acesso a uma função de busca de imóveis reais no catálogo da Smolka.

FLUXO DE QUALIFICAÇÃO PARA BUSCA:
1. Primeiro, pergunte qual TIPO de imóvel (apartamento, casa, etc.)
2. Depois, pergunte qual BAIRRO ou região de interesse
3. Em seguida, pergunte a FAIXA DE PREÇO
4. Se relevante, pergunte número de quartos

QUANDO BUSCAR IMÓVEIS:
- Use a função buscar_imoveis assim que tiver pelo menos 2 critérios do cliente
- Não espere ter todas as informações - comece a buscar com o que tem
- Se o cliente disser "quero um apartamento no Centro até 500 mil", já pode buscar!

COMO APRESENTAR RESULTADOS:
Quando encontrar imóveis, apresente assim:
1. Mensagem introdutória: "Encontrei uma opção que pode te interessar!"
2. Use [ENVIAR_FOTO:url] para enviar a foto do imóvel
3. Depois envie as características em bullets:
   🏠 *Apartamento em [Bairro]*
   • X dormitórios (X suíte)
   • X vagas de garagem
   • Xm² de área útil
   • R$ XXX.XXX
   🔗 [link do imóvel]
4. Pergunte: "Faz sentido pra você?" ou "Quer conhecer esse?"

Se não encontrar imóveis, diga: "No momento não encontrei opções com esses critérios. Quer que eu ajuste a busca?"`;
  }

  // Rapport Techniques
  if (config.rapport_enabled) {
    prompt += `\n\nTÉCNICAS DE RAPPORT (aplique naturalmente):`;
    if (config.rapport_use_name) {
      prompt += `\n- Use o nome do cliente de forma natural durante a conversa (sem exageros)`;
    }
    if (config.rapport_mirror_language) {
      prompt += `\n- Adapte seu estilo de comunicação ao do cliente (formal/informal)`;
    }
    if (config.rapport_show_empathy) {
      prompt += `\n- Demonstre interesse genuíno nas necessidades do cliente`;
    }
    if (config.rapport_validate_emotions) {
      prompt += `\n- Valide preocupações e emoções do cliente antes de responder objetivamente`;
    }
  }

  // Mental Triggers
  if (config.triggers_enabled) {
    prompt += `\n\nGATILHOS DE CONVERSÃO (use quando apropriado, sem forçar):`;
    if (config.trigger_urgency) {
      prompt += `\n- Urgência: Crie senso de oportunidade quando houver prazos ou condições especiais`;
    }
    if (config.trigger_scarcity) {
      prompt += `\n- Escassez: Mencione disponibilidade limitada de forma honesta quando for real`;
    }
    if (config.trigger_social_proof && config.social_proof_text) {
      prompt += `\n- Prova Social: Use quando relevante - "${config.social_proof_text}"`;
    }
    if (config.trigger_authority && config.authority_text) {
      prompt += `\n- Autoridade: Mencione quando apropriado - "${config.authority_text}"`;
    }
  }

  // Objections Handling
  if (config.objections && config.objections.length > 0) {
    prompt += `\n\nTRATAMENTO DE OBJEÇÕES (quando o cliente apresentar estas objeções, use estas respostas como guia):`;
    for (const obj of config.objections) {
      prompt += `\n\nSe o cliente disser: "${obj.objection}"
Responda algo como: "${obj.response}"`;
    }
  }

  // SPIN Qualification (adjusted for property search)
  if (config.spin_enabled) {
    prompt += `\n\nQUALIFICAÇÃO DE LEADS (use perguntas SPIN para entender melhor o cliente):`;
    
    prompt += `\n\nPerguntas de SITUAÇÃO (contexto atual):
- Você está procurando imóvel para comprar ou alugar?
- Qual tipo de imóvel procura? Apartamento, casa...?
- Qual região ou bairro seria ideal pra você?`;
    
    prompt += `\n\nPerguntas de PROBLEMA (dores e dificuldades):
- Qual faixa de preço você tem em mente?
- Quantos quartos você precisa?
- Precisa de garagem? Quantas vagas?`;

    prompt += `\n\nIMPORTANTE: Não faça todas as perguntas de uma vez. Conduza naturalmente a conversa, fazendo 1-2 perguntas relevantes por mensagem. Assim que tiver critérios suficientes, USE A FUNÇÃO buscar_imoveis!`;
  }

  // Knowledge Base
  if (config.knowledge_base_content) {
    prompt += `\n\nBASE DE CONHECIMENTO (informações extraídas do nosso site - use como referência):
${config.knowledge_base_content}`;
  }

  // Limitations
  if (config.limitations && config.limitations.length > 0) {
    prompt += `\n\nLIMITAÇÕES (sempre encaminhe ao atendente humano):
${config.limitations.map(l => `• ${l}`).join('\n')}`;
  }

  // Escalation Criteria
  if (config.escalation_criteria && config.escalation_criteria.length > 0) {
    prompt += `\n\nCRITÉRIOS PARA ESCALONAMENTO (encaminhe para atendente humano se):
${config.escalation_criteria.map(c => `• ${c}`).join('\n')}`;
  }

  // FAQs
  if (config.faqs && config.faqs.length > 0) {
    prompt += `\n\nPERGUNTAS FREQUENTES (use como referência):
${config.faqs.map(faq => `P: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}`;
  }

  // Custom Instructions
  if (config.custom_instructions) {
    prompt += `\n\nINSTRUÇÕES ESPECIAIS:
${config.custom_instructions}`;
  }

  // Humanization instructions
  if (config.humanize_responses) {
    prompt += `\n\nESTILO DE COMUNICAÇÃO HUMANIZADO:
- Use linguagem natural e coloquial (mas educada)
- Inclua pequenas variações e interjeições naturais como "olha só", "então", "veja bem"
- Demonstre empatia quando apropriado
- Faça pausas naturais com "..." em momentos de reflexão
- Evite respostas robóticas ou muito padronizadas
- Varie as saudações e despedidas`;

    if (config.emoji_intensity !== 'none') {
      const emojiLevel = config.emoji_intensity === 'low' ? 'ocasionalmente (1-2 por mensagem)' : 'moderadamente (2-3 por mensagem)';
      prompt += `\n- Use emojis ${emojiLevel} para tornar a conversa mais amigável`;
    }
  }

  prompt += `\n\nINSTRUÇÕES GERAIS:
1. Sempre cumprimente cordialmente
2. Identifique a necessidade do cliente usando as técnicas de qualificação
3. Se puder ajudar, responda objetivamente
4. Se não puder ou atingir critério de escalonamento, use: "${config.fallback_message}"
5. Use linguagem ${config.tone === 'formal' ? 'formal mas acolhedora' : config.tone}

⚠️ REGRA DE APRESENTAÇÃO DE IMÓVEIS:
- NUNCA mostre mais de 1 imóvel por vez
- Após mostrar um imóvel, SEMPRE pergunte "Faz sentido pra você?"
- AGUARDE a resposta do cliente antes de mostrar outra opção
- Se o cliente disser que não gostou ou não faz sentido, pergunte: "Quer que eu te mostre outra opção?"
- Só busque/mostre outro imóvel APÓS o cliente confirmar que quer ver mais opções
- Se o cliente gostar, pergunte: "Quer que eu agende uma visita?"

⚠️ REGRA CRÍTICA DE FORMATAÇÃO PARA WHATSAPP:
- MÁXIMO 80-100 caracteres por frase/mensagem
- Escreva como se estivesse conversando no WhatsApp: mensagens curtas e diretas
- UMA ideia por mensagem, não agrupe informações
- Se tiver várias coisas para dizer, responda com frases separadas
- NUNCA use parágrafos longos ou listas extensas
- Prefira perguntar "quer que eu explique mais?" do que explicar tudo de uma vez
- Seja conciso: menos palavras = melhor comunicação
- Evite repetir informações que o cliente já sabe

Exemplo BOM:
"Oi! Tudo bem? 😊"
"Vi que você tem interesse em imóveis."
"Posso te ajudar! Está procurando para alugar ou comprar?"

Exemplo RUIM:
"Olá! Tudo bem? Sou a Helena da Smolka Imóveis e estou aqui para ajudá-lo a encontrar o imóvel perfeito. Trabalhamos com diversos tipos de imóveis como apartamentos, casas e salas comerciais nas regiões de Florianópolis e região."`;


  // Customer context
  if (contactName && config.use_customer_name && config.rapport_use_name) {
    prompt += `\n\nCONTEXTO DO CLIENTE:
- Nome: ${contactName} (use naturalmente nas interações para criar conexão)`;
  }
  if (contactType) {
    prompt += `\n- Tipo: ${contactType === 'proprietario' ? 'Proprietário' : 'Inquilino'}`;
  }

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

// Search properties using Vista CRM API
async function searchProperties(params: Record<string, any>): Promise<any> {
  try {
    console.log('🏠 Searching properties with params:', params);
    
    const { data, error } = await supabase.functions.invoke('vista-search-properties', {
      body: params
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
  lines.push(`🔗 ${property.link}`);
  
  return lines.join('\n');
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
        model: config.ai_model || 'google/gemini-2.5-flash',
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

async function generateAudio(text: string, config: AIAgentConfig): Promise<string | null> {
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

    console.log('✅ Audio generated:', data.audioUrl);
    return data.audioUrl;
  } catch (e) {
    console.error('❌ Error generating audio:', e);
    return null;
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

async function sendWhatsAppAudio(to: string, audioUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-wa-media', {
      body: {
        to,
        mediaUrl: audioUrl,
        mediaType: 'audio',
        filename: 'Mensagem de voz.mp3',
        caption: ''
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
    const { phoneNumber, messageBody, messageType, contactName, contactType } = await req.json();

    console.log('🤖 AI Virtual Agent triggered:', { phoneNumber, messageBody, messageType });

    if (!phoneNumber || !messageBody) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing phoneNumber or messageBody' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
        console.log('📋 Loaded AI config:', { 
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
      }
    } catch (e) {
      console.log('Using default AI config');
    }

    // Get conversation history for context
    const historyLimit = config.max_history_messages || 5;
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('body, direction, created_at')
      .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`)
      .order('created_at', { ascending: false })
      .limit(historyLimit);

    // Build conversation context
    const conversationHistory = recentMessages?.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.body || ''
    })).filter(msg => msg.content) || [];

    conversationHistory.push({
      role: 'user',
      content: messageBody
    });

    // Build dynamic system prompt with all new features
    const systemPrompt = buildSystemPrompt(config, contactName, contactType);

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
      promptLength: systemPrompt.length
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
          }
          
          // Call AI again with tool results to get proper response
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
            }
          ];

          // Get AI's response after seeing tool results
          const followUpResult = await callAIWithTools(aiConfig, toolResultMessages, false);
          aiMessage = followUpResult.content;
        }
      }
    }

    if (!aiMessage && propertiesToSend.length === 0) {
      throw new Error('No response from AI');
    }

    console.log('✅ AI response received:', aiMessage?.substring(0, 100));

    // Process and send messages
    let messagesSent = 0;
    
    // Determine response mode based on channel mirroring
    let responseMode: 'text' | 'audio' = 'text';
    
    if (config.audio_channel_mirroring && config.audio_enabled) {
      responseMode = messageType === 'audio' ? 'audio' : 'text';
      console.log(`🔄 Channel mirroring: customer sent ${messageType} → responding with ${responseMode}`);
    } else if (config.audio_enabled) {
      responseMode = config.audio_mode === 'audio_only' ? 'audio' : 'text';
    }
    
    // Send text response first (if any)
    if (aiMessage && responseMode === 'text') {
      if (config.fragment_long_messages && config.humanize_responses) {
        const fragments = fragmentMessage(aiMessage, 100);
        console.log(`📝 Text mode: fragmented into ${fragments.length} parts (100 chars max)`);
        
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
      const audioUrl = await generateAudio(audioText, config);
      if (audioUrl) {
        await sendWhatsAppAudio(phoneNumber, audioUrl);
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
        
        await supabase
          .from('conversation_states')
          .upsert({
            phone_number: phoneNumber,
            pending_properties: remainingProperties,
            updated_at: new Date().toISOString()
          }, { onConflict: 'phone_number' });
      }
      
      // Ask confirmation question
      await sleep(1500);
      await sendWhatsAppMessage(phoneNumber, "Faz sentido pra você? 😊");
      messagesSent++;
    }

    // If NOT mirroring, also send audio based on audio_mode
    if (!config.audio_channel_mirroring && config.audio_enabled && config.audio_mode === 'text_and_audio' && aiMessage) {
      const audioUrl = await generateAudio(aiMessage, config);
      if (audioUrl) {
        await sendWhatsAppAudio(phoneNumber, audioUrl);
        messagesSent++;
      }
    }

    console.log(`📱 ${messagesSent} WhatsApp message(s) sent`);

    // Update conversation state
    await supabase
      .from('conversation_states')
      .upsert({
        phone_number: phoneNumber,
        is_ai_active: true,
        last_ai_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });

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
