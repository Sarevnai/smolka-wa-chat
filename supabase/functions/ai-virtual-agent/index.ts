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
  max_tokens: 500,
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

  // SPIN Qualification
  if (config.spin_enabled) {
    prompt += `\n\nQUALIFICAÇÃO DE LEADS (use perguntas SPIN para entender melhor o cliente):`;
    
    if (config.spin_situation_questions && config.spin_situation_questions.length > 0) {
      prompt += `\n\nPerguntas de SITUAÇÃO (contexto atual):
${config.spin_situation_questions.map(q => `- ${q}`).join('\n')}`;
    }
    
    if (config.spin_problem_questions && config.spin_problem_questions.length > 0) {
      prompt += `\n\nPerguntas de PROBLEMA (dores e dificuldades):
${config.spin_problem_questions.map(q => `- ${q}`).join('\n')}`;
    }
    
    if (config.spin_implication_questions && config.spin_implication_questions.length > 0) {
      prompt += `\n\nPerguntas de IMPLICAÇÃO (consequências de não resolver):
${config.spin_implication_questions.map(q => `- ${q}`).join('\n')}`;
    }
    
    if (config.spin_need_questions && config.spin_need_questions.length > 0) {
      prompt += `\n\nPerguntas de NECESSIDADE (guiar para solução):
${config.spin_need_questions.map(q => `- ${q}`).join('\n')}`;
    }

    prompt += `\n\nIMPORTANTE: Não faça todas as perguntas de uma vez. Conduza naturalmente a conversa, fazendo 1-2 perguntas relevantes por mensagem.`;
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
5. Mantenha respostas ${config.fragment_long_messages ? 'curtas (máximo 2-3 frases por bloco)' : 'curtas (máximo 3 parágrafos)'}
6. Use linguagem ${config.tone === 'formal' ? 'formal mas acolhedora' : config.tone}`;

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

// Fragment long messages into smaller parts
function fragmentMessage(text: string, maxLength: number = 150): string[] {
  if (text.length <= maxLength) return [text];
  
  const fragments: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentFragment = '';
  
  for (const sentence of sentences) {
    if ((currentFragment + ' ' + sentence).trim().length <= maxLength) {
      currentFragment = (currentFragment + ' ' + sentence).trim();
    } else {
      if (currentFragment) fragments.push(currentFragment);
      currentFragment = sentence;
    }
  }
  
  if (currentFragment) fragments.push(currentFragment);
  
  return fragments.flatMap(frag => {
    if (frag.length <= maxLength * 1.5) return [frag];
    const parts = frag.split(/,\s*/);
    const result: string[] = [];
    let current = '';
    for (const part of parts) {
      if ((current + ', ' + part).length <= maxLength) {
        current = current ? current + ', ' + part : part;
      } else {
        if (current) result.push(current);
        current = part;
      }
    }
    if (current) result.push(current);
    return result;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callAI(config: AIAgentConfig, messages: any[]): Promise<string> {
  const provider = config.ai_provider || 'openai';
  
  console.log(`🤖 Using AI provider: ${provider}, model: ${config.ai_model}`);
  
  if (provider === 'openai') {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.ai_model || 'gpt-4o-mini',
        messages,
        max_tokens: config.max_tokens || 500,
        temperature: 0.8,
      }),
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
    return data.choices?.[0]?.message?.content || '';
  } else {
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
    return data.choices?.[0]?.message?.content || '';
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
          objectionsCount: config.objections?.length || 0
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

    const estimatedTokens = Math.ceil((systemPrompt.length + conversationHistory.reduce((acc, m) => acc + m.content.length, 0)) / 4);
    console.log('📊 Token estimation:', {
      provider: config.ai_provider,
      model: config.ai_model,
      historyMessages: conversationHistory.length,
      estimatedInputTokens: estimatedTokens,
      maxOutputTokens: config.max_tokens,
      promptLength: systemPrompt.length
    });

    // Call AI
    const aiMessage = await callAI(config, [
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ]);

    if (!aiMessage) {
      throw new Error('No response from AI');
    }

    console.log('✅ AI response received:', aiMessage.substring(0, 100));

    // Process and send messages
    let messagesSent = 0;
    
    if (config.fragment_long_messages && config.humanize_responses) {
      const fragments = fragmentMessage(aiMessage, 180);
      console.log(`📝 Message fragmented into ${fragments.length} parts`);
      
      for (let i = 0; i < fragments.length; i++) {
        const fragment = fragments[i];
        
        if (config.audio_mode !== 'audio_only') {
          await sendWhatsAppMessage(phoneNumber, fragment);
          messagesSent++;
        }
        
        if (config.audio_enabled && config.audio_mode !== 'text_only') {
          const audioUrl = await generateAudio(fragment, config);
          if (audioUrl) {
            await sendWhatsAppAudio(phoneNumber, audioUrl);
            messagesSent++;
          }
        }
        
        if (i < fragments.length - 1) {
          const delay = config.message_delay_ms || 2000;
          const variation = Math.random() * 1000 - 500;
          await sleep(Math.max(1000, delay + variation));
        }
      }
    } else {
      if (config.audio_mode !== 'audio_only') {
        await sendWhatsAppMessage(phoneNumber, aiMessage);
        messagesSent++;
      }
      
      if (config.audio_enabled && config.audio_mode !== 'text_only') {
        const audioUrl = await generateAudio(aiMessage, config);
        if (audioUrl) {
          await sendWhatsAppAudio(phoneNumber, audioUrl);
          messagesSent++;
        }
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
