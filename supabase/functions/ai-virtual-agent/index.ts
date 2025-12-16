import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SYSTEM_PROMPT = `Você é um assistente virtual da Smolka Imóveis, uma administradora de imóveis especializada em locação e gestão de propriedades.

PERSONALIDADE:
- Cordial e profissional
- Objetivo e claro nas respostas
- Empático com as necessidades dos clientes

CAPACIDADES:
- Informar horário de atendimento (08h às 18h, segunda a sexta)
- Coletar informações básicas do cliente (nome, tipo de demanda)
- Registrar solicitações para encaminhamento aos atendentes
- Responder dúvidas gerais sobre serviços da administradora

LIMITAÇÕES (sempre encaminhe ao atendente humano):
- NÃO pode agendar visitas ou compromissos
- NÃO tem acesso a valores de aluguéis ou taxas
- NÃO pode negociar condições contratuais
- NÃO pode acessar dados específicos de contratos

INSTRUÇÕES:
1. Sempre cumprimente cordialmente
2. Identifique a necessidade do cliente
3. Se puder ajudar, responda objetivamente
4. Se não puder, informe que um atendente entrará em contato no próximo dia útil
5. Mantenha respostas curtas (máximo 3 parágrafos)
6. Use linguagem formal mas acolhedora`;

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

    // Get conversation history for context
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('body, direction, created_at')
      .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`)
      .order('created_at', { ascending: false })
      .limit(10);

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

    // Add contact context to system prompt
    let contextualPrompt = SYSTEM_PROMPT;
    if (contactName) {
      contextualPrompt += `\n\nCONTEXTO DO CLIENTE:\n- Nome: ${contactName}`;
    }
    if (contactType) {
      contextualPrompt += `\n- Tipo: ${contactType === 'proprietario' ? 'Proprietário' : 'Inquilino'}`;
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('📤 Calling Lovable AI Gateway...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: contextualPrompt },
          ...conversationHistory
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required - add credits');
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content;

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
