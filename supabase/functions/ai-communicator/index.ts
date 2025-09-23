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
  const systemPrompt = `Você é um assistente de IA avançado para a administradora de imóveis Smolka com ACESSO COMPLETO À PLATAFORMA.

🎯 CAPACIDADES PRINCIPAIS:
- Análise completa de conversas e mensagens
- Gestão completa de tickets e demandas
- Relatórios detalhados em tempo real
- Gestão de contatos e relacionamentos
- Automação de processos
- Insights preditivos e recomendações

📊 DADOS DISPONÍVEIS EM TEMPO REAL:
${JSON.stringify(businessContext, null, 2)}

🔧 COMANDOS E AÇÕES DISPONÍVEIS:
RELATÓRIOS E ANÁLISES:
- "relatório completo" - Dashboard com todas as métricas
- "análise de conversas" - Padrões de comunicação
- "performance de atendimento" - Tempos de resposta e qualidade
- "relatório de tickets" - Status e distribuição
- "resumo do dia/semana/mês" - Período específico
- "top contatos" - Clientes mais ativos
- "análise de sentimento" - Satisfação dos clientes

GESTÃO DE TICKETS:
- "criar ticket para [telefone]" - Novo chamado
- "status dos tickets" - Pipeline completo
- "tickets pendentes" - Demandas em aberto
- "resumir ticket [ID]" - Detalhes específicos
- "priorizar tickets" - Organização por urgência

GESTÃO DE CONTATOS:
- "perfil do contato [telefone]" - Histórico completo
- "contatos ativos hoje" - Atividade recente
- "segmentação de clientes" - Grupos e categorias
- "oportunidades de vendas" - Leads potenciais

AUTOMAÇÃO:
- "automatizar resposta para [situação]"
- "criar template para [categoria]"
- "configurar alerta para [condição]"
- "agendar campanha"

INSIGHTS E RECOMENDAÇÕES:
- "oportunidades de melhoria"
- "alertas importantes"
- "previsões de demanda"
- "recomendações estratégicas"

🤖 PERSONALIDADE:
Seja proativo, analítico e estratégico. Não apenas responda perguntas, mas:
- Identifique padrões e tendências
- Sugira melhorias e otimizações
- Antecipe necessidades do usuário
- Forneça contexto e insights acionáveis
- Use os dados para recomendar ações concretas

Quando o usuário pedir qualquer informação, consulte os dados disponíveis e forneça respostas detalhadas e úteis.`;

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
          description: 'Gerar relatório de dados específicos',
          parameters: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['messages', 'tickets', 'contacts', 'performance', 'complete'] },
              period: { type: 'string', enum: ['today', 'week', 'month', 'custom'] },
              filters: { type: 'object' }
            },
            required: ['type']
          }
        },
        {
          name: 'get_conversation_summary',
          description: 'Obter resumo de conversas de um contato',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              limit: { type: 'number' }
            },
            required: ['phone']
          }
        },
        {
          name: 'get_contact_profile',
          description: 'Obter perfil completo de um contato',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' }
            },
            required: ['phone']
          }
        },
        {
          name: 'analyze_sentiment',
          description: 'Analisar sentimento de conversas recentes',
          parameters: {
            type: 'object',
            properties: {
              phone: { type: 'string' },
              period: { type: 'string' }
            }
          }
        },
        {
          name: 'get_ticket_status',
          description: 'Obter status detalhado de tickets',
          parameters: {
            type: 'object',
            properties: {
              stage: { type: 'string' },
              priority: { type: 'string' }
            }
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
  const todayISO = today.toISOString();

  // Data da semana para análises mais amplas
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoISO = weekAgo.toISOString();

  const [
    { count: todayMessages },
    { count: weekMessages },
    { count: activeTickets },
    { count: completedTickets },
    { count: totalContacts },
    { count: activeContacts },
    { data: recentTickets },
    { data: recentMessages },
    { data: ticketsByStage },
    { data: messagesByDirection },
    { data: topContactsWithMessages },
    { data: campaigns },
    { data: templates }
  ] = await Promise.all([
    // Mensagens hoje
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    
    // Mensagens da semana
    supabase.from('messages').select('*', { count: 'exact', head: true }).gte('created_at', weekAgoISO),
    
    // Tickets ativos
    supabase.from('tickets').select('*', { count: 'exact', head: true }).neq('stage', 'concluido'),
    
    // Tickets concluídos
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('stage', 'concluido'),
    
    // Total de contatos
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    
    // Contatos ativos
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    
    // Tickets recentes com detalhes
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(10),
    
    // Mensagens recentes
    supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(20),
    
    // Distribuição de tickets por estágio
    supabase.from('tickets').select('stage, count(*)', { count: 'exact' }),
    
    // Mensagens por direção (entrada/saída)
    supabase.from('messages').select('direction, count(*)', { count: 'exact' }).gte('created_at', todayISO),
    
    // Top contatos com mais mensagens
    supabase.from('messages').select('wa_from, count(*) as message_count').gte('created_at', weekAgoISO).not('wa_from', 'is', null).limit(10),
    
    // Campanhas
    supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(5),
    
    // Templates disponíveis
    supabase.from('message_templates').select('*').limit(10)
  ]);

  // Calcular conversas ativas únicas
  const uniqueNumbers = new Set();
  recentMessages?.forEach(msg => {
    if (msg.direction === 'inbound' && msg.wa_from) {
      uniqueNumbers.add(msg.wa_from);
    }
  });

  return {
    stats: {
      todayMessages: todayMessages || 0,
      weekMessages: weekMessages || 0,
      activeTickets: activeTickets || 0,
      completedTickets: completedTickets || 0,
      totalContacts: totalContacts || 0,
      activeContacts: activeContacts || 0,
      activeConversations: uniqueNumbers.size
    },
    recentActivity: {
      tickets: recentTickets || [],
      messages: recentMessages || []
    },
    analytics: {
      ticketsByStage: ticketsByStage || [],
      messagesByDirection: messagesByDirection || [],
      topContacts: topContactsWithMessages || []
    },
    campaigns: campaigns || [],
    templates: templates || [],
    currentDateTime: new Date().toISOString()
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
        case 'get_conversation_summary':
          await getConversationSummaryAction(action.parameters);
          break;
        case 'get_contact_profile':
          await getContactProfileAction(action.parameters);
          break;
        case 'analyze_sentiment':
          await analyzeSentimentAction(action.parameters);
          break;
        case 'get_ticket_status':
          await getTicketStatusAction(action.parameters);
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
  const { type, period, filters } = params;
  
  // Generate specific reports based on type
  switch (type) {
    case 'messages':
      return await generateMessagesReport(period, filters);
    case 'tickets':
      return await generateTicketsReport(period, filters);
    case 'contacts':
      return await generateContactsReport(period, filters);
    case 'performance':
      return await generatePerformanceReport(period, filters);
    case 'complete':
      return await generateCompleteReport(period, filters);
    default:
      console.log('Generating general report:', params);
  }
}

async function getConversationSummaryAction(params: any) {
  const { phone, limit = 20 } = params;
  
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .or(`wa_from.eq.${phone},wa_to.eq.${phone}`)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  return messages;
}

async function getContactProfileAction(params: any) {
  const { phone } = params;
  
  const [
    { data: contact },
    { data: messages },
    { data: tickets },
    { data: contracts }
  ] = await Promise.all([
    supabase.from('contacts').select('*').eq('phone', phone).single(),
    supabase.from('messages').select('*').or(`wa_from.eq.${phone},wa_to.eq.${phone}`).order('created_at', { ascending: false }).limit(10),
    supabase.from('tickets').select('*').eq('phone', phone).order('created_at', { ascending: false }),
    supabase.from('contact_contracts').select('*').eq('contact_id', contact?.id || '')
  ]);
  
  return { contact, messages, tickets, contracts };
}

async function analyzeSentimentAction(params: any) {
  const { phone, period = 'week' } = params;
  
  let dateFilter = new Date();
  if (period === 'week') dateFilter.setDate(dateFilter.getDate() - 7);
  if (period === 'month') dateFilter.setMonth(dateFilter.getMonth() - 1);
  
  const { data: messages } = await supabase
    .from('messages')
    .select('body, direction, created_at')
    .or(`wa_from.eq.${phone},wa_to.eq.${phone}`)
    .gte('created_at', dateFilter.toISOString())
    .not('body', 'is', null);
    
  return messages;
}

async function getTicketStatusAction(params: any) {
  const { stage, priority } = params;
  
  let query = supabase.from('tickets').select('*');
  
  if (stage) query = query.eq('stage', stage);
  if (priority) query = query.eq('priority', priority);
  
  const { data: tickets } = await query.order('created_at', { ascending: false });
  
  return tickets;
}

async function sendMessageAction(params: any) {
  // Implementation for sending WhatsApp messages
  console.log('Sending message:', params);
}

// Helper functions for detailed reports
async function generateMessagesReport(period: string, filters: any) {
  const today = new Date();
  let startDate = new Date();
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(today.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(today.getMonth() - 1);
      break;
  }
  
  const { data: messages, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .gte('created_at', startDate.toISOString());
    
  return { total: count, messages, period };
}

async function generateTicketsReport(period: string, filters: any) {
  const { data: tickets, count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' });
    
  return { total: count, tickets, period };
}

async function generateContactsReport(period: string, filters: any) {
  const { data: contacts, count } = await supabase
    .from('contacts')
    .select('*', { count: 'exact' });
    
  return { total: count, contacts, period };
}

async function generatePerformanceReport(period: string, filters: any) {
  const businessContext = await getBusinessContext('system');
  return { performance: businessContext.stats, period };
}

async function generateCompleteReport(period: string, filters: any) {
  const businessContext = await getBusinessContext('system');
  return { complete: businessContext, period };
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