import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messageId, contactPhone, messageText, messageDirection, context } = await req.json();
    
    console.log('AI Assistant processing:', { messageId, contactPhone, messageDirection });

    // Get Lovable AI API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable AI API key not configured');
    }

    // Fetch contact context
    const { data: contact } = await supabase
      .from('contacts')
      .select(`
        *,
        contact_contracts (
          contract_number,
          contract_type,
          property_code,
          status
        )
      `)
      .eq('phone', contactPhone)
      .single();

    // Get recent message history
    const { data: recentMessages } = await supabase
      .from('messages')
      .select('direction, body, created_at')
      .or(`wa_from.eq.${contactPhone},wa_to.eq.${contactPhone}`)
      .order('created_at', { ascending: false })
      .limit(10);

    // Build context for AI
    const aiContext = {
      contact: contact || { phone: contactPhone, contact_type: 'unknown' },
      recentMessages: recentMessages || [],
      currentMessage: { text: messageText, direction: messageDirection },
      businessContext: "Administradora de imóveis Smolka - gerenciamento de propriedades, inquilinos e proprietários"
    };

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(lovableApiKey, aiContext);

    // Save suggestions to database
    for (const suggestion of suggestions) {
      await supabase
        .from('ai_suggestions')
        .insert({
          message_id: messageId,
          contact_phone: contactPhone,
          suggestion_type: suggestion.type,
          suggestion_content: suggestion.content,
          confidence_score: suggestion.confidence
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      suggestions,
      contactContext: contact
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI Assistant:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateAISuggestions(apiKey: string, context: any) {
  const systemPrompt = `Você é um assistente de IA especializado em atendimento ao cliente para uma administradora de imóveis.

PERFIL DO NEGÓCIO:
- Administradora Smolka Imóveis
- Gerencia propriedades, proprietários e inquilinos
- Tipos de demanda: manutenção, pagamentos, contratos, documentos, dúvidas gerais

CONTEXTO DO CONTATO:
- Tipo: ${context.contact.contact_type || 'não identificado'}
- Contratos: ${context.contact.contact_contracts?.length || 0}
- Histórico: ${context.recentMessages?.length || 0} mensagens recentes

TAREFA:
Analise a mensagem atual e gere sugestões para o atendente:

1. CLASSIFICAÇÃO: Categorize a demanda (manutenção, financeiro, contratual, etc.)
2. URGÊNCIA: Determine prioridade (baixa, média, alta, crítica)
3. RESPOSTA_SUGERIDA: Sugira uma resposta profissional e personalizada
4. AÇÕES_RECOMENDADAS: Próximos passos (criar ticket, agendar visita, etc.)
5. EXTRAÇÃO_DADOS: Extraia informações importantes (endereços, valores, datas)

Retorne um JSON estruturado com cada tipo de sugestão e sua confiança (0-1).`;

  const userMessage = `
MENSAGEM ATUAL: "${context.currentMessage.text}"
DIREÇÃO: ${context.currentMessage.direction}

HISTÓRICO RECENTE:
${context.recentMessages.map((msg: any) => `${msg.direction}: ${msg.body}`).join('\n')}

Analise e forneça sugestões detalhadas.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      response_format: { type: "json_object" }
    }),
  });

  const data = await response.json();
  const aiResponse = JSON.parse(data.choices[0].message.content);

  // Convert AI response to structured suggestions
  const suggestions = [];

  if (aiResponse.classificacao) {
    suggestions.push({
      type: 'classification',
      content: aiResponse.classificacao,
      confidence: aiResponse.confianca_classificacao || 0.8
    });
  }

  if (aiResponse.urgencia) {
    suggestions.push({
      type: 'urgency',
      content: aiResponse.urgencia,
      confidence: aiResponse.confianca_urgencia || 0.7
    });
  }

  if (aiResponse.resposta_sugerida) {
    suggestions.push({
      type: 'response',
      content: {
        text: aiResponse.resposta_sugerida,
        tone: aiResponse.tom || 'profissional'
      },
      confidence: aiResponse.confianca_resposta || 0.75
    });
  }

  if (aiResponse.acoes_recomendadas) {
    suggestions.push({
      type: 'action',
      content: aiResponse.acoes_recomendadas,
      confidence: aiResponse.confianca_acoes || 0.7
    });
  }

  if (aiResponse.dados_extraidos) {
    suggestions.push({
      type: 'data_extraction',
      content: aiResponse.dados_extraidos,
      confidence: aiResponse.confianca_dados || 0.6
    });
  }

  return suggestions;
}