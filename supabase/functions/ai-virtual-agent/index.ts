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
};

const toneDescriptions: Record<string, string> = {
  formal: 'Formal e profissional',
  casual: 'Casual e descontraído',
  friendly: 'Amigável e acolhedor',
  technical: 'Técnico e preciso'
};

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

  prompt += `\n\nINSTRUÇÕES GERAIS:
1. Sempre cumprimente cordialmente
2. Identifique a necessidade do cliente
3. Se puder ajudar, responda objetivamente
4. Se não puder, use esta mensagem: "${config.fallback_message}"
5. Mantenha respostas curtas (máximo 3 parágrafos)
6. Use linguagem ${config.tone === 'formal' ? 'formal mas acolhedora' : config.tone}`;

  if (contactName) {
    prompt += `\n\nCONTEXTO DO CLIENTE:
- Nome: ${contactName}`;
  }
  if (contactType) {
    prompt += `\n- Tipo: ${contactType === 'proprietario' ? 'Proprietário' : 'Inquilino'}`;
  }

  return prompt;
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
        temperature: 0.7,
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
    let config = defaultConfig;
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
          maxTokens: config.max_tokens,
          maxHistory: config.max_history_messages 
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

    // Send message via WhatsApp
    const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-wa-message', {
      body: {
        to: phoneNumber,
        text: aiMessage
      }
    });

    if (sendError) {
      console.error('❌ Error sending WhatsApp message:', sendError);
      throw new Error('Failed to send WhatsApp message');
    }

    console.log('📱 WhatsApp message sent:', sendResult);

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
