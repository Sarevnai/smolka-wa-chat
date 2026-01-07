import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

interface FlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface FlowExecution {
  id: string;
  conversation_id: string;
  flow_id: string;
  phone_number: string;
  current_node_id: string;
  variables: Record<string, unknown>;
  context: Record<string, unknown>;
  status: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { 
      phone_number, 
      message, 
      conversation_id,
      department_code 
    } = await req.json();

    console.log(`[FlowExecutor] Processing message from ${phone_number}: "${message?.substring(0, 50)}..."`);

    // 1. Buscar execução ativa ou iniciar nova
    let execution = await getOrCreateExecution(
      supabase, 
      phone_number, 
      conversation_id, 
      department_code
    );

    if (!execution) {
      console.log('[FlowExecutor] No active flow for this department');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active flow found' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Buscar o fluxo completo
    const { data: flow, error: flowError } = await supabase
      .from('ai_flows')
      .select('*')
      .eq('id', execution.flow_id)
      .single();

    if (flowError || !flow) {
      console.error('[FlowExecutor] Flow not found:', flowError);
      throw new Error('Flow not found');
    }

    const nodes = flow.nodes as FlowNode[];
    const edges = flow.edges as FlowEdge[];

    // 3. Executar o fluxo a partir do nó atual
    const result = await executeFlow(
      supabase,
      execution,
      nodes,
      edges,
      message,
      phone_number
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[FlowExecutor] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function getOrCreateExecution(
  supabase: ReturnType<typeof createClient>,
  phoneNumber: string,
  conversationId: string,
  departmentCode: string
): Promise<FlowExecution | null> {
  
  // Buscar execução ativa existente (incluindo waiting_input)
  const { data: existingExecution } = await supabase
    .from('flow_executions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .in('status', ['running', 'waiting_response', 'waiting_input'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingExecution) {
    console.log('[FlowExecutor] Found existing execution:', existingExecution.id);
    return existingExecution;
  }

  // Buscar fluxo ativo para o departamento
  const { data: activeFlow } = await supabase
    .from('ai_flows')
    .select('id')
    .eq('department_code', departmentCode)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (!activeFlow) {
    console.log('[FlowExecutor] No active flow for department:', departmentCode);
    return null;
  }

  // Buscar o nó de início
  const { data: flow } = await supabase
    .from('ai_flows')
    .select('nodes')
    .eq('id', activeFlow.id)
    .single();

  const nodes = (flow?.nodes as FlowNode[]) || [];
  const startNode = nodes.find(n => n.type === 'start');

  if (!startNode) {
    console.log('[FlowExecutor] No start node found in flow');
    return null;
  }

  // Criar nova execução
  const { data: newExecution, error } = await supabase
    .from('flow_executions')
    .insert({
      conversation_id: conversationId,
      flow_id: activeFlow.id,
      phone_number: phoneNumber,
      current_node_id: startNode.id,
      status: 'running',
      variables: {},
      context: {}
    })
    .select()
    .single();

  if (error) {
    console.error('[FlowExecutor] Error creating execution:', error);
    return null;
  }

  console.log('[FlowExecutor] Created new execution:', newExecution.id);
  return newExecution;
}

async function executeFlow(
  supabase: ReturnType<typeof createClient>,
  execution: FlowExecution,
  nodes: FlowNode[],
  edges: FlowEdge[],
  userMessage: string,
  phoneNumber: string
): Promise<{ success: boolean; response?: string; action?: string; escalated?: boolean }> {
  
  let currentNodeId = execution.current_node_id;
  let variables = { ...execution.variables } as Record<string, unknown>;
  let response = '';
  let escalated = false;
  let maxIterations = 20; // Prevenir loops infinitos

  // Buscar dados do contato
  const { data: contact } = await supabase
    .from('contacts')
    .select('name, email')
    .eq('phone', phoneNumber)
    .maybeSingle();

  variables['nome'] = contact?.name || 'Cliente';
  variables['telefone'] = phoneNumber;
  variables['mensagem'] = userMessage;
  variables['data_hoje'] = new Date().toLocaleDateString('pt-BR');

  while (maxIterations > 0) {
    maxIterations--;

    const currentNode = nodes.find(n => n.id === currentNodeId);
    if (!currentNode) {
      console.error('[FlowExecutor] Node not found:', currentNodeId);
      break;
    }

    console.log(`[FlowExecutor] Processing node: ${currentNode.type} (${currentNodeId})`);
    const startTime = Date.now();

    const config = currentNode.data.config || {};

    switch (currentNode.type) {
      case 'start': {
        // Nó de início - apenas avança
        const nextNode = getNextNode(currentNodeId, edges);
        if (nextNode) {
          currentNodeId = nextNode;
        } else {
          maxIterations = 0;
        }
        break;
      }

      case 'message': {
        const text = replaceVariables(config.text as string || '', variables);
        const delay = (config.delay as number) || 0;

        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }

        // Enviar mensagem
        await sendWhatsAppMessage(supabase, phoneNumber, text);
        response = text;

        await logExecution(supabase, execution.id, currentNodeId, 'message', 'sent', { text }, { success: true }, Date.now() - startTime);

        const nextNode = getNextNode(currentNodeId, edges);
        if (nextNode) {
          currentNodeId = nextNode;
        } else {
          maxIterations = 0;
        }
        break;
      }

      case 'condition': {
        const conditionType = config.conditionType as string;
        const branches = (config.branches as Array<{ 
          id: string; 
          label: string; 
          value: string;
          keywords?: string[];
        }>) || [];
        let matchedBranch: string | null = null;

        if (conditionType === 'keyword') {
          const messageLower = userMessage.toLowerCase();
          
          // FASE 2: Verificar keywords POR BRANCH primeiro
          for (const branch of branches) {
            const branchKeywords = branch.keywords || [];
            
            if (branchKeywords.length > 0) {
              for (const keyword of branchKeywords) {
                if (messageLower.includes(keyword.toLowerCase())) {
                  matchedBranch = branch.id;
                  console.log(`[FlowExecutor] Branch "${branch.label}" matched by keyword: "${keyword}"`);
                  break;
                }
              }
            }
            
            if (matchedBranch) break;
          }
          
          // Fallback para keywords globais (compatibilidade legado)
          if (!matchedBranch) {
            const globalKeywords = (config.keywords as string[]) || [];
            for (const keyword of globalKeywords) {
              if (messageLower.includes(keyword.toLowerCase())) {
                matchedBranch = branches.find(b => b.value === 'yes')?.id || branches[0]?.id;
                console.log(`[FlowExecutor] Matched by global keyword: "${keyword}"`);
                break;
              }
            }
          }
          
          // Default: último branch se nenhum match (branch padrão)
          if (!matchedBranch && branches.length > 0) {
            matchedBranch = branches[branches.length - 1].id;
            console.log(`[FlowExecutor] No match, using default branch: "${branches[branches.length - 1].label}"`);
          }
        } else if (conditionType === 'intent') {
          // Usar IA para detectar intenção
          const intent = await detectIntent(userMessage, config.intent as string);
          matchedBranch = intent ? branches[0]?.id : branches[1]?.id;
        } else if (conditionType === 'time') {
          const now = new Date();
          const hour = now.getHours();
          const start = parseInt((config.timeRange as { start: string })?.start?.split(':')[0] || '9');
          const end = parseInt((config.timeRange as { end: string })?.end?.split(':')[0] || '18');
          matchedBranch = (hour >= start && hour < end) ? branches[0]?.id : branches[1]?.id;
        } else if (conditionType === 'variable') {
          // Checar valor de variável capturada
          const variableName = config.variableName as string;
          const variableValue = variables[variableName];
          console.log(`[FlowExecutor] Checking variable "${variableName}" = "${variableValue}"`);
          
          for (const branch of branches) {
            // Comparar value da branch com valor da variável
            if (branch.value && String(variableValue).toLowerCase().includes(branch.value.toLowerCase())) {
              matchedBranch = branch.id;
              break;
            }
          }
          
          if (!matchedBranch && branches.length > 0) {
            matchedBranch = branches[branches.length - 1].id;
          }
        }

        await logExecution(supabase, execution.id, currentNodeId, 'condition', 'evaluated', 
          { conditionType, userMessage }, 
          { matchedBranch }, 
          Date.now() - startTime
        );

        // Buscar próximo nó baseado no branch (suporta prefixo 'branch-')
        const nextEdge = edges.find(e => 
          e.source === currentNodeId && 
          (e.sourceHandle === `branch-${matchedBranch}` || e.sourceHandle === matchedBranch)
        );
        if (nextEdge) {
          currentNodeId = nextEdge.target;
        } else {
          const defaultNext = getNextNode(currentNodeId, edges);
          if (defaultNext) {
            currentNodeId = defaultNext;
          } else {
            maxIterations = 0;
          }
        }
        break;
      }

      case 'action': {
        const actionType = config.actionType as string;
        
        if (actionType === 'update_vista') {
          // Chamar edge function do Vista
          const vistaFields = config.vistaFields as Record<string, string>;
          try {
            await supabase.functions.invoke('vista-update-property', {
              body: {
                propertyCode: replaceVariables(vistaFields?.propertyCode || '', variables),
                status: vistaFields?.status,
                value: vistaFields?.value
              }
            });
          } catch (e) {
            console.error('[FlowExecutor] Vista update error:', e);
          }
        } else if (actionType === 'add_tag' || actionType === 'remove_tag') {
          // Gerenciar tags do contato
          const tagId = config.tagId as string;
          if (tagId) {
            const { data: contactData } = await supabase
              .from('contacts')
              .select('id')
              .eq('phone', phoneNumber)
              .maybeSingle();

            if (contactData) {
              if (actionType === 'add_tag') {
                await supabase.from('contact_tag_assignments').insert({
                  contact_id: contactData.id,
                  tag_id: tagId
                }).onConflict('contact_id,tag_id').doNothing();
              } else {
                await supabase.from('contact_tag_assignments')
                  .delete()
                  .eq('contact_id', contactData.id)
                  .eq('tag_id', tagId);
              }
            }
          }
        } else if (actionType === 'update_contact') {
          const contactFields = config.contactFields as Record<string, string>;
          if (contactFields) {
            const updates: Record<string, string> = {};
            if (contactFields.name) updates.name = replaceVariables(contactFields.name, variables);
            if (contactFields.email) updates.email = replaceVariables(contactFields.email, variables);
            if (contactFields.type) updates.contact_type = contactFields.type;

            if (Object.keys(updates).length > 0) {
              await supabase.from('contacts').update(updates).eq('phone', phoneNumber);
            }
          }
        }

        await logExecution(supabase, execution.id, currentNodeId, 'action', actionType, config, { success: true }, Date.now() - startTime);

        const nextNode = getNextNode(currentNodeId, edges);
        if (nextNode) {
          currentNodeId = nextNode;
        } else {
          maxIterations = 0;
        }
        break;
      }

      case 'escalation': {
        const department = config.department as string;
        const priority = config.priority as string;
        const reason = config.reason as string;

        // Atualizar conversa para escalar
        await supabase
          .from('conversations')
          .update({
            department_code: department,
            status: 'pending',
            tags: [`priority:${priority}`, 'escalated']
          })
          .eq('id', execution.conversation_id);

        // Atualizar estado do contato
        await supabase
          .from('contacts')
          .update({
            ai_handling: false,
            operator_takeover_at: new Date().toISOString()
          })
          .eq('phone', phoneNumber);

        await logExecution(supabase, execution.id, currentNodeId, 'escalation', 'escalated', 
          { department, priority, reason }, 
          { success: true }, 
          Date.now() - startTime
        );

        // Marcar execução como escalada
        await supabase
          .from('flow_executions')
          .update({
            status: 'escalated',
            current_node_id: currentNodeId,
            variables,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        escalated = true;
        maxIterations = 0;
        break;
      }

      case 'integration': {
        const url = config.url as string;
        const method = (config.method as string) || 'POST';
        const headers = (config.headers as Record<string, string>) || {};
        const body = config.body as string;

        if (url) {
          try {
            const integrationResponse = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...headers
              },
              body: method !== 'GET' ? replaceVariables(body || '{}', variables) : undefined
            });

            const integrationData = await integrationResponse.json();
            variables['integration_response'] = integrationData;

            await logExecution(supabase, execution.id, currentNodeId, 'integration', 'called', 
              { url, method }, 
              { status: integrationResponse.status, data: integrationData }, 
              Date.now() - startTime
            );
          } catch (e) {
            console.error('[FlowExecutor] Integration error:', e);
          }
        }

        const nextNode = getNextNode(currentNodeId, edges);
        if (nextNode) {
          currentNodeId = nextNode;
        } else {
          maxIterations = 0;
        }
        break;
      }

      case 'delay': {
        const duration = (config.duration as number) || 1;
        const unit = (config.unit as string) || 'seconds';

        let ms = duration * 1000;
        if (unit === 'minutes') ms = duration * 60 * 1000;
        if (unit === 'hours') ms = duration * 60 * 60 * 1000;

        // Para delays longos, pausar a execução
        if (ms > 30000) {
          await supabase
            .from('flow_executions')
            .update({
              status: 'paused',
              current_node_id: getNextNode(currentNodeId, edges) || currentNodeId,
              variables
            })
            .eq('id', execution.id);

          // TODO: Agendar retomada do fluxo
          maxIterations = 0;
        } else {
          await new Promise(resolve => setTimeout(resolve, ms));
          const nextNode = getNextNode(currentNodeId, edges);
          if (nextNode) {
            currentNodeId = nextNode;
          } else {
            maxIterations = 0;
          }
        }
        break;
      }

      // FASE 1: Suporte ao Input Node - Capturar respostas do usuário
      case 'input': {
        const variableName = config.variableName as string;
        const expectedType = config.expectedType as string;
        const timeout = (config.timeout as number) || 300;
        const timeoutAction = (config.timeoutAction as string) || 'retry';
        
        console.log(`[FlowExecutor] Input node: waiting for ${variableName} (type: ${expectedType})`);
        
        // Se estamos retomando de waiting_input, capturar o valor
        if (execution.status === 'waiting_input') {
          let capturedValue: unknown = userMessage;
          let isValid = true;
          
          // Validar e converter valor baseado em expectedType
          if (expectedType === 'number') {
            const numValue = parseFloat(userMessage.replace(/\D/g, ''));
            if (isNaN(numValue)) {
              isValid = false;
            } else {
              capturedValue = numValue;
            }
          } else if (expectedType === 'currency') {
            // Extrair valor monetário: "500 mil" -> 500000, "R$ 1.200.000" -> 1200000
            const cleaned = userMessage.replace(/[^\d,\.kmil]/gi, '');
            let numValue = parseFloat(cleaned.replace(',', '.'));
            if (userMessage.toLowerCase().includes('mil')) {
              numValue = numValue * 1000;
            } else if (userMessage.toLowerCase().includes('milh')) {
              numValue = numValue * 1000000;
            }
            capturedValue = isNaN(numValue) ? userMessage : numValue;
          } else if (expectedType === 'yes_no') {
            const lower = userMessage.toLowerCase();
            if (['sim', 'yes', 'ok', 'pode', 's', 'claro', 'positivo'].some(k => lower.includes(k))) {
              capturedValue = true;
            } else if (['não', 'nao', 'no', 'n', 'nunca', 'negativo'].some(k => lower.includes(k))) {
              capturedValue = false;
            } else {
              capturedValue = userMessage;
            }
          } else if (expectedType === 'email') {
            const emailMatch = userMessage.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
            capturedValue = emailMatch ? emailMatch[0] : userMessage;
          } else if (expectedType === 'phone') {
            capturedValue = userMessage.replace(/\D/g, '');
          }
          
          // Salvar variável
          variables[variableName] = capturedValue;
          console.log(`[FlowExecutor] Captured ${variableName} = ${capturedValue}`);
          
          await logExecution(supabase, execution.id, currentNodeId, 'input', 'captured', 
            { variableName, expectedType, rawInput: userMessage }, 
            { value: capturedValue, isValid }, 
            Date.now() - startTime
          );
          
          // Atualizar status para running
          await supabase
            .from('flow_executions')
            .update({
              status: 'running',
              variables
            })
            .eq('id', execution.id);
          
          // Avançar para próximo nó
          const nextNode = getNextNode(currentNodeId, edges);
          if (nextNode) {
            currentNodeId = nextNode;
          } else {
            maxIterations = 0;
          }
        } else {
          // Primeira vez neste nó - pausar e aguardar input
          console.log(`[FlowExecutor] Pausing for user input: ${variableName}`);
          
          await supabase
            .from('flow_executions')
            .update({
              status: 'waiting_input',
              current_node_id: currentNodeId,
              variables,
              context: { 
                ...execution.context, 
                waiting_for: variableName, 
                timeout_at: Date.now() + (timeout * 1000),
                timeout_action: timeoutAction
              }
            })
            .eq('id', execution.id);
          
          await logExecution(supabase, execution.id, currentNodeId, 'input', 'waiting', 
            { variableName, expectedType, timeout }, 
            { status: 'waiting_input' }, 
            Date.now() - startTime
          );
          
          maxIterations = 0; // Sair do loop e aguardar próxima mensagem
        }
        break;
      }

      case 'end': {
        const endMessage = config.message as string;
        const closeConversation = config.closeConversation as boolean;

        if (endMessage) {
          const text = replaceVariables(endMessage, variables);
          await sendWhatsAppMessage(supabase, phoneNumber, text);
          response = text;
        }

        if (closeConversation) {
          await supabase
            .from('conversations')
            .update({
              status: 'closed',
              closed_at: new Date().toISOString(),
              closed_reason: 'flow_completed'
            })
            .eq('id', execution.conversation_id);
        }

        await logExecution(supabase, execution.id, currentNodeId, 'end', 'completed', config, { success: true }, Date.now() - startTime);

        // Marcar execução como completa
        await supabase
          .from('flow_executions')
          .update({
            status: 'completed',
            current_node_id: currentNodeId,
            variables,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);

        maxIterations = 0;
        break;
      }

      default:
        console.log('[FlowExecutor] Unknown node type:', currentNode.type);
        const nextNode = getNextNode(currentNodeId, edges);
        if (nextNode) {
          currentNodeId = nextNode;
        } else {
          maxIterations = 0;
        }
    }

    // Se o próximo nó precisa de input do usuário, pausar
    const nextNodeObj = nodes.find(n => n.id === currentNodeId);
    if (nextNodeObj?.type === 'condition' && maxIterations > 0) {
      await supabase
        .from('flow_executions')
        .update({
          status: 'waiting_response',
          current_node_id: currentNodeId,
          variables
        })
        .eq('id', execution.id);
      break;
    }
  }

  return {
    success: true,
    response,
    escalated
  };
}

function getNextNode(currentNodeId: string, edges: FlowEdge[]): string | null {
  const edge = edges.find(e => e.source === currentNodeId);
  return edge?.target || null;
}

function replaceVariables(text: string, variables: Record<string, unknown>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value || ''));
  }
  return result;
}

async function sendWhatsAppMessage(
  supabase: ReturnType<typeof createClient>,
  phoneNumber: string,
  message: string
): Promise<void> {
  try {
    await supabase.functions.invoke('send-wa-message', {
      body: { to: phoneNumber, message }
    });
  } catch (error) {
    console.error('[FlowExecutor] Error sending WhatsApp message:', error);
  }
}

async function detectIntent(message: string, targetIntent: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um detector de intenção. Analise a mensagem e responda apenas "sim" ou "não" se a mensagem indica a intenção "${targetIntent}".`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 10
      }),
    });

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.toLowerCase() || '';
    return answer.includes('sim');
  } catch (error) {
    console.error('[FlowExecutor] Intent detection error:', error);
    return false;
  }
}

async function logExecution(
  supabase: ReturnType<typeof createClient>,
  executionId: string,
  nodeId: string,
  nodeType: string,
  actionTaken: string,
  inputData: unknown,
  outputData: unknown,
  durationMs: number
): Promise<void> {
  try {
    await supabase.from('flow_execution_logs').insert({
      execution_id: executionId,
      node_id: nodeId,
      node_type: nodeType,
      action_taken: actionTaken,
      input_data: inputData,
      output_data: outputData,
      duration_ms: durationMs
    });
  } catch (error) {
    console.error('[FlowExecutor] Error logging execution:', error);
  }
}
