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
}

const defaultConfig: AIAgentConfig = {
  agent_name: 'Assistente Virtual',
  company_name: 'Smolka Imóveis',
  company_description: 'Administradora de imóveis especializada em locação e gestão de propriedades.',
  services: ['Locação de imóveis', 'Gestão de propriedades', 'Administração de condomínios'],
  tone: 'formal',
  limitations: [
    'Não pode agendar visitas ou compromissos',
    'Não tem acesso a valores de aluguéis ou taxas',
    'Não pode negociar condições contratuais',
    'Não pode acessar dados específicos de contratos'
  ],
  faqs: [],
  custom_instructions: '',
  greeting_message: 'Olá! Sou o assistente virtual da {company_name}. Como posso ajudá-lo?',
  fallback_message: 'Entendi sua solicitação. Um de nossos atendentes entrará em contato no próximo dia útil para ajudá-lo melhor.',
  ai_provider: 'openai',
  ai_model: 'gpt-4o-mini',
  max_tokens: 500,
  max_history_messages: 5,
  // Humanization defaults
  humanize_responses: true,
  fragment_long_messages: true,
  message_delay_ms: 2000,
  emoji_intensity: 'low',
  use_customer_name: true,
  // Audio defaults
  audio_enabled: false,
  audio_voice_id: '',
  audio_voice_name: 'Sarah',
  audio_mode: 'text_and_audio',
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
${config.company_description}

SERVIÇOS OFERECIDOS:
${config.services.map(s => `• ${s}`).join('\n')}

LIMITAÇÕES (sempre encaminhe ao atendente humano):
${config.limitations.map(l => `• ${l}`).join('\n')}`;

  if (config.faqs && config.faqs.length > 0) {
    prompt += `\n\nPERGUNTAS FREQUENTES (use como referência):
${config.faqs.map(faq => `P: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}`;
  }

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
2. Identifique a necessidade do cliente
3. Se puder ajudar, responda objetivamente
4. Se não puder, use esta mensagem: "${config.fallback_message}"
5. Mantenha respostas ${config.fragment_long_messages ? 'curtas (máximo 2-3 frases por bloco)' : 'curtas (máximo 3 parágrafos)'}
6. Use linguagem ${config.tone === 'formal' ? 'formal mas acolhedora' : config.tone}`;

  if (contactName && config.use_customer_name) {
    prompt += `\n\nCONTEXTO DO CLIENTE:
- Nome: ${contactName} (use o nome nas interações para personalizar)`;
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
  
  // If we still have very long fragments, split by commas or force split
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

// Add delay between messages
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
        temperature: 0.8, // Slightly higher for more natural responses
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
    // Lovable AI Gateway (Google Gemini)
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

// Generate audio from text
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

// Send WhatsApp message
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

// Send WhatsApp audio
async function sendWhatsAppAudio(to: string, audioUrl: string): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('send-wa-media', {
      body: {
        to,
        mediaUrl: audioUrl,
        mediaType: 'audio',
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
          fragment: config.fragment_long_messages,
          audio: config.audio_enabled,
          audioMode: config.audio_mode
        });
      }
    } catch (e) {
      console.log('Using default AI config');
    }

    // Get conversation history for context (limited by config)
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

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: messageBody
    });

    // Build dynamic system prompt
    const systemPrompt = buildSystemPrompt(config, contactName, contactType);

    // Log token estimation
    const estimatedTokens = Math.ceil((systemPrompt.length + conversationHistory.reduce((acc, m) => acc + m.content.length, 0)) / 4);
    console.log('📊 Token estimation:', {
      provider: config.ai_provider,
      model: config.ai_model,
      historyMessages: conversationHistory.length,
      estimatedInputTokens: estimatedTokens,
      maxOutputTokens: config.max_tokens
    });

    // Call AI with configured provider
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
      // Fragment and send with delays (humanized)
      const fragments = fragmentMessage(aiMessage, 180);
      console.log(`📝 Message fragmented into ${fragments.length} parts`);
      
      for (let i = 0; i < fragments.length; i++) {
        const fragment = fragments[i];
        
        // Send text (unless audio_only mode)
        if (config.audio_mode !== 'audio_only') {
          await sendWhatsAppMessage(phoneNumber, fragment);
          messagesSent++;
        }
        
        // Generate and send audio for each fragment
        if (config.audio_enabled && config.audio_mode !== 'text_only') {
          const audioUrl = await generateAudio(fragment, config);
          if (audioUrl) {
            await sendWhatsAppAudio(phoneNumber, audioUrl);
            messagesSent++;
          }
        }
        
        // Add delay between fragments (simulates typing)
        if (i < fragments.length - 1) {
          const delay = config.message_delay_ms || 2000;
          const variation = Math.random() * 1000 - 500; // +/- 500ms variation
          await sleep(Math.max(1000, delay + variation));
        }
      }
    } else {
      // Send as single message
      if (config.audio_mode !== 'audio_only') {
        await sendWhatsAppMessage(phoneNumber, aiMessage);
        messagesSent++;
      }
      
      // Generate and send audio
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
        ai_started_at: new Date().toISOString(),
        last_ai_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'phone_number' });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'AI response sent',
        provider: config.ai_provider,
        model: config.ai_model,
        messagesSent,
        audioEnabled: config.audio_enabled,
        humanized: config.humanize_responses,
        aiMessage: aiMessage.substring(0, 100) + '...'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in ai-virtual-agent:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
