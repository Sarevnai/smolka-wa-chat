import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

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
    const { action, userId, message, conversationId, context } = await req.json();
    
    console.log('AI Communicator action:', action);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    switch (action) {
      case 'start_conversation':
        return await startConversation(userId);
      
      case 'send_message':
        return await processMessage(userId, message, conversationId, context, openAIApiKey);
      
      case 'get_insights':
        return await generateInsights(userId, context, openAIApiKey);
      
      case 'execute_command':
        return await executeCommand(userId, message, context, openAIApiKey);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in AI Communicator:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function startConversation(userId: string) {
  // Create new AI conversation
  const { data: conversation, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      conversation_type: 'assistant',
      messages: [{
        role: 'assistant',
        content: 'Olá! Sou seu assistente de IA da Smolka Imóveis. Posso ajudar com:\n\n• Criar tickets automaticamente\n• Gerar relatórios\n• Sugerir respostas\n• Analisar dados do CRM\n\nComo posso ajudar?',
        timestamp: new Date().toISOString()
      }]
    })
    .select()
    .single();

  if (error) throw error;

  return new Response(JSON.stringify({ 
    success: true, 
    conversation 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function processMessage(userId: string, message: string, conversationId: string, context: any, apiKey: string) {
  // Get conversation history
  const { data: conversation } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Get business context
  const businessContext = await getBusinessContext(userId);

  // Generate AI response
  const aiResponse = await generateCommunicatorResponse(apiKey, message, conversation.messages, businessContext, context);

  // Update conversation with new messages
  const updatedMessages = [
    ...conversation.messages,
    {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    },
    {
      role: 'assistant',
      content: aiResponse.message,
      timestamp: new Date().toISOString(),
      actions: aiResponse.actions || []
    }
  ];

  // Save updated conversation
  await supabase
    .from('ai_conversations')
    .update({ 
      messages: updatedMessages,
      context_data: context 
    })
    .eq('id', conversationId);

  // Execute any automated actions
  if (aiResponse.actions && aiResponse.actions.length > 0) {
    await executeActions(userId, aiResponse.actions, context);
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: aiResponse.message,
    actions: aiResponse.actions || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateCommunicatorResponse(apiKey: string, userMessage: string, history: any[], businessContext: any, context: any) {
  const systemPrompt = `Você é um assistente de IA avançado para a administradora de imóveis Smolka.

CAPACIDADES:
- Criar e gerenciar tickets
- Gerar relatórios e insights
- Executar comandos no CRM
- Fornecer análises de dados
- Automatizar tarefas repetitivas

CONTEXTO DO NEGÓCIO:
${JSON.stringify(businessContext, null, 2)}

COMANDOS DISPONÍVEIS:
- "criar ticket para [telefone]" - Cria ticket automaticamente
- "relatório de hoje" - Gera relatório do dia
- "status do pipeline" - Mostra status dos tickets
- "contatos ativos" - Lista contatos ativos
- "análise de sentimento" - Analisa satisfação dos clientes

Seja conversacional, útil e proativo. Quando identificar uma oportunidade de automatizar algo, sugira ações concretas.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      functions: [
        {
          name: 'create_ticket',
          description: 'Criar um ticket no sistema',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              priority: { type: 'string' }
            },
            required: ['phone', 'title', 'description']
          }
        },
        {
          name: 'generate_report',
          description: 'Gerar relatório de dados',
          parameters: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              period: { type: 'string' },
              filters: { type: 'object' }
            },
            required: ['type']
          }
        },
        {
          name: 'send_message',
          description: 'Enviar mensagem WhatsApp',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              message: { type: 'string' }
            },
            required: ['phone', 'message']
          }
        }
      ],
      function_call: 'auto'
    }),
  });

  const data = await response.json();
  const choice = data.choices[0];

  let actions = [];
  let message = choice.message.content;

  // Check if AI wants to call a function
  if (choice.message.function_call) {
    const functionCall = choice.message.function_call;
    const functionArgs = JSON.parse(functionCall.arguments);
    
    actions.push({
      type: functionCall.name,
      parameters: functionArgs
    });

    // Generate a user-friendly message about the action
    message = `Perfeito! Vou executar essa ação para você. ${choice.message.content || ''}`;
  }

  return { message, actions };
}

async function getBusinessContext(userId: string) {
  // Get current stats and data
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    { count: todayMessages },
    { count: activeTickets },
    { count: totalContacts },
    { data: recentTickets }
  ] = await Promise.all([
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).neq('stage', 'concluido'),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(5)
  ]);

  return {
    stats: {
      todayMessages: todayMessages || 0,
      activeTickets: activeTickets || 0,
      totalContacts: totalContacts || 0
    },
    recentActivity: recentTickets || []
  };
}

async function executeActions(userId: string, actions: any[], context: any) {
  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create_ticket':
          await createTicketAction(action.parameters);
          break;
        case 'generate_report':
          await generateReportAction(action.parameters);
          break;
        case 'send_message':
          await sendMessageAction(action.parameters);
          break;
      }
    } catch (error) {
      console.error(`Error executing action ${action.type}:`, error);
    }
  }
}

async function createTicketAction(params: any) {
  const { phone, title, description, category, priority } = params;
  
  await supabase
    .from('tickets')
    .insert({
      phone,
      title,
      description,
      category: category || 'geral',
      priority: priority || 'media',
      stage: 'novo',
      type: 'geral',
      source: 'ai_assistant'
    });
}

async function generateReportAction(params: any) {
  // Implementation for generating reports
  console.log('Generating report:', params);
}

async function sendMessageAction(params: any) {
  // Implementation for sending WhatsApp messages
  console.log('Sending message:', params);
}

async function generateInsights(userId: string, context: any, apiKey: string) {
  const businessContext = await getBusinessContext(userId);
  
  const prompt = `Analise os dados do CRM e gere insights acionáveis:

DADOS ATUAIS:
${JSON.stringify(businessContext, null, 2)}

Forneça:
1. Tendências identificadas
2. Oportunidades de melhoria
3. Alertas importantes
4. Recomendações de ação

Seja específico e prático.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    }),
  });

  const data = await response.json();
  const insights = data.choices[0].message.content;

  return new Response(JSON.stringify({ 
    success: true, 
    insights 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function executeCommand(userId: string, command: string, context: any, apiKey: string) {
  // Process natural language commands
  const businessContext = await getBusinessContext(userId);
  
  const response = await generateCommunicatorResponse(apiKey, command, [], businessContext, context);
  
  if (response.actions && response.actions.length > 0) {
    await executeActions(userId, response.actions, context);
  }

  return new Response(JSON.stringify({ 
    success: true, 
    message: response.message,
    actions: response.actions || []
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}