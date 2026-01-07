import { useState, useCallback, useRef } from 'react';
import { AIFlow, CustomFlowNode, CustomFlowEdge, FlowNodeType, ConditionNodeConfig, MessageNodeConfig, InputNodeConfig, ActionNodeConfig, EscalationNodeConfig, IntegrationNodeConfig, DelayNodeConfig, EndNodeConfig } from '@/types/flow';
import { supabase } from '@/integrations/supabase/client';

export type TestStatus = 'idle' | 'running' | 'waiting_input' | 'completed' | 'error';

export interface TestMessage {
  id: string;
  type: 'bot' | 'user' | 'system';
  content: string;
  timestamp: Date;
  nodeId?: string;
}

export interface ExecutionLogEntry {
  nodeId: string;
  nodeType: FlowNodeType;
  nodeLabel: string;
  action: string;
  input?: unknown;
  output?: unknown;
  durationMs: number;
  timestamp: Date;
  success: boolean;
}

export interface TestConfig {
  testRealIntegrations: boolean;
  contactName: string;
  contactPhone: string;
}

interface FlowTestState {
  status: TestStatus;
  currentNodeId: string | null;
  variables: Record<string, unknown>;
  messages: TestMessage[];
  executionLog: ExecutionLogEntry[];
  visitedNodes: string[];
  error: string | null;
}

const initialState: FlowTestState = {
  status: 'idle',
  currentNodeId: null,
  variables: {},
  messages: [],
  executionLog: [],
  visitedNodes: [],
  error: null,
};

export function useFlowTest(flow: AIFlow | null) {
  const [state, setState] = useState<FlowTestState>(initialState);
  const [config, setConfig] = useState<TestConfig>({
    testRealIntegrations: false,
    contactName: 'Cliente Teste',
    contactPhone: '+5548999999999',
  });
  
  const autoModeRef = useRef(false);
  const processingRef = useRef(false);

  // Helper to add message
  const addMessage = useCallback((type: TestMessage['type'], content: string, nodeId?: string) => {
    const message: TestMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      content,
      timestamp: new Date(),
      nodeId,
    };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, message],
    }));
    return message;
  }, []);

  // Helper to add log entry
  const addLogEntry = useCallback((
    nodeId: string, 
    nodeType: FlowNodeType, 
    nodeLabel: string,
    action: string,
    success: boolean,
    input?: unknown,
    output?: unknown,
    durationMs = 0
  ) => {
    const entry: ExecutionLogEntry = {
      nodeId,
      nodeType,
      nodeLabel,
      action,
      input,
      output,
      durationMs,
      timestamp: new Date(),
      success,
    };
    setState(prev => ({
      ...prev,
      executionLog: [...prev.executionLog, entry],
    }));
    return entry;
  }, []);

  // Find the next node(s) connected to a source
  const getNextNode = useCallback((currentNodeId: string, sourceHandle?: string): CustomFlowNode | null => {
    if (!flow) return null;
    
    const edge = flow.edges.find(e => {
      if (e.source !== currentNodeId) return false;
      if (sourceHandle && e.sourceHandle !== sourceHandle) return false;
      return true;
    });
    
    if (!edge) return null;
    return flow.nodes.find(n => n.id === edge.target) || null;
  }, [flow]);

  // Process a single node
  const processNode = useCallback(async (node: CustomFlowNode): Promise<{ nextNode: CustomFlowNode | null; waitForInput: boolean }> => {
    const startTime = Date.now();
    const nodeType = node.type as FlowNodeType;
    const nodeLabel = node.data?.label || nodeType;
    const nodeConfig = node.data?.config || {};

    setState(prev => ({
      ...prev,
      currentNodeId: node.id,
      visitedNodes: prev.visitedNodes.includes(node.id) ? prev.visitedNodes : [...prev.visitedNodes, node.id],
    }));

    try {
      switch (nodeType) {
        case 'start': {
          addLogEntry(node.id, nodeType, nodeLabel, 'Fluxo iniciado', true);
          addMessage('system', '🚀 Fluxo iniciado');
          return { nextNode: getNextNode(node.id), waitForInput: false };
        }

        case 'message': {
          const msgConfig = nodeConfig as MessageNodeConfig;
          let text = msgConfig.text || '[Mensagem vazia]';
          
          // Replace variables
          text = text.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
            const value = state.variables[varName];
            if (varName === 'nome' && !value) return config.contactName;
            return value !== undefined ? String(value) : `{{${varName}}}`;
          });
          
          addMessage('bot', text, node.id);
          addLogEntry(node.id, nodeType, nodeLabel, `Mensagem enviada`, true, undefined, { text });
          
          if (msgConfig.delay && msgConfig.delay > 0) {
            addMessage('system', `⏱️ Aguardando ${msgConfig.delay}ms...`);
          }
          
          return { nextNode: getNextNode(node.id), waitForInput: false };
        }

        case 'input': {
          const inputConfig = nodeConfig as InputNodeConfig;
          if (inputConfig.prompt) {
            addMessage('bot', inputConfig.prompt, node.id);
          }
          addMessage('system', `📝 Aguardando entrada: ${inputConfig.variableName} (${inputConfig.expectedType})`);
          addLogEntry(node.id, nodeType, nodeLabel, `Aguardando input: ${inputConfig.variableName}`, true);
          
          return { nextNode: null, waitForInput: true };
        }

        case 'condition': {
          const condConfig = nodeConfig as ConditionNodeConfig;
          addLogEntry(node.id, nodeType, nodeLabel, `Condição: ${condConfig.conditionType}`, true);
          addMessage('system', `🔀 Condição: Aguardando resposta para avaliar (${condConfig.conditionType})`);
          
          // For conditions, we wait for user input
          return { nextNode: null, waitForInput: true };
        }

        case 'action': {
          const actionConfig = nodeConfig as ActionNodeConfig;
          
          if (actionConfig.actionType === 'update_vista') {
            if (config.testRealIntegrations) {
              // Call real Vista API
              addMessage('system', '🔄 Chamando API Vista (modo real)...');
              try {
                const { data, error } = await supabase.functions.invoke('vista-update-property', {
                  body: {
                    propertyCode: state.variables.codigo_imovel || 'TEST-001',
                    fields: actionConfig.vistaFields || {},
                  }
                });
                
                if (error) throw error;
                addMessage('system', `✅ Vista atualizado: ${JSON.stringify(data)}`);
                addLogEntry(node.id, nodeType, nodeLabel, 'Vista atualizado (real)', true, actionConfig.vistaFields, data);
              } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
                addMessage('system', `❌ Erro Vista: ${errorMsg}`);
                addLogEntry(node.id, nodeType, nodeLabel, 'Erro Vista', false, actionConfig.vistaFields, { error: errorMsg });
              }
            } else {
              // Mock Vista response
              addMessage('system', '🔄 [MOCK] Atualizando Vista...');
              const mockResult = {
                success: true,
                message: '[MOCK] Imóvel atualizado com sucesso',
                campos_atualizados: actionConfig.vistaFields || {},
              };
              addMessage('system', `✅ [MOCK] ${mockResult.message}`);
              addLogEntry(node.id, nodeType, nodeLabel, 'Vista atualizado (mock)', true, actionConfig.vistaFields, mockResult);
            }
          } else if (actionConfig.actionType === 'set_variable') {
            setState(prev => ({
              ...prev,
              variables: {
                ...prev.variables,
                [actionConfig.variableName || 'var']: actionConfig.variableValue,
              }
            }));
            addLogEntry(node.id, nodeType, nodeLabel, `Variável definida: ${actionConfig.variableName}`, true);
          } else {
            addLogEntry(node.id, nodeType, nodeLabel, `Ação: ${actionConfig.actionType}`, true);
          }
          
          return { nextNode: getNextNode(node.id), waitForInput: false };
        }

        case 'escalation': {
          const escConfig = nodeConfig as EscalationNodeConfig;
          addMessage('system', `👤 Escalado para ${escConfig.department} (prioridade: ${escConfig.priority})`);
          addLogEntry(node.id, nodeType, nodeLabel, `Escalado para ${escConfig.department}`, true);
          return { nextNode: getNextNode(node.id), waitForInput: false };
        }

        case 'integration': {
          const intConfig = nodeConfig as IntegrationNodeConfig;
          
          if (config.testRealIntegrations && intConfig.url) {
            addMessage('system', `🔗 Chamando ${intConfig.integrationType}: ${intConfig.url}`);
            // In real mode, you would call the actual endpoint
            // For now, we'll mock it
            addLogEntry(node.id, nodeType, nodeLabel, `Integração: ${intConfig.integrationType}`, true);
          } else {
            addMessage('system', `🔗 [MOCK] Integração ${intConfig.integrationType}`);
            addLogEntry(node.id, nodeType, nodeLabel, `Integração mock: ${intConfig.integrationType}`, true);
          }
          
          return { nextNode: getNextNode(node.id), waitForInput: false };
        }

        case 'delay': {
          const delayConfig = nodeConfig as DelayNodeConfig;
          const delayText = `${delayConfig.duration} ${delayConfig.unit}`;
          addMessage('system', `⏰ [Delay: ${delayText}] (pulado no modo teste)`);
          addLogEntry(node.id, nodeType, nodeLabel, `Delay: ${delayText}`, true);
          return { nextNode: getNextNode(node.id), waitForInput: false };
        }

        case 'end': {
          const endConfig = nodeConfig as EndNodeConfig;
          if (endConfig.message) {
            addMessage('bot', endConfig.message, node.id);
          }
          addMessage('system', '🏁 Fluxo concluído!');
          addLogEntry(node.id, nodeType, nodeLabel, 'Fluxo finalizado', true);
          setState(prev => ({ ...prev, status: 'completed' }));
          return { nextNode: null, waitForInput: false };
        }

        default:
          addLogEntry(node.id, nodeType, nodeLabel, `Tipo não suportado: ${nodeType}`, false);
          return { nextNode: getNextNode(node.id), waitForInput: false };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      addLogEntry(node.id, nodeType, nodeLabel, `Erro: ${errorMsg}`, false, undefined, undefined, duration);
      setState(prev => ({ ...prev, status: 'error', error: errorMsg }));
      return { nextNode: null, waitForInput: false };
    }
  }, [flow, state.variables, config, addMessage, addLogEntry, getNextNode]);

  // Continue execution from current node
  const continueExecution = useCallback(async (fromNode: CustomFlowNode | null) => {
    if (!fromNode || processingRef.current) return;
    
    processingRef.current = true;
    let currentNode: CustomFlowNode | null = fromNode;

    while (currentNode) {
      const { nextNode, waitForInput } = await processNode(currentNode);
      
      if (waitForInput) {
        setState(prev => ({ ...prev, status: 'waiting_input' }));
        processingRef.current = false;
        return;
      }

      if (state.status === 'completed' || state.status === 'error') {
        processingRef.current = false;
        return;
      }

      currentNode = nextNode;
      
      // Small delay between nodes for visibility
      if (currentNode) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // No more nodes
    if (state.status === 'running') {
      setState(prev => ({ ...prev, status: 'completed' }));
      addMessage('system', '🏁 Fluxo concluído (sem mais nós)');
    }
    
    processingRef.current = false;
  }, [processNode, state.status, addMessage]);

  // Start test
  const startTest = useCallback(() => {
    if (!flow) return;
    
    setState({
      ...initialState,
      status: 'running',
      variables: {
        nome: config.contactName,
        telefone: config.contactPhone,
      },
    });
    
    // Find start node
    const startNode = flow.nodes.find(n => n.type === 'start');
    if (!startNode) {
      setState(prev => ({ ...prev, status: 'error', error: 'Nó de início não encontrado' }));
      return;
    }

    // Start execution
    setTimeout(() => continueExecution(startNode), 100);
  }, [flow, config, continueExecution]);

  // Send test message (user input)
  const sendTestMessage = useCallback((message: string) => {
    if (!flow || state.status !== 'waiting_input') return;
    
    addMessage('user', message);
    
    // Find current node
    const currentNode = flow.nodes.find(n => n.id === state.currentNodeId);
    if (!currentNode) return;

    const nodeType = currentNode.type as FlowNodeType;
    const nodeConfig = currentNode.data?.config;

    // Handle input node - capture variable
    if (nodeType === 'input' && nodeConfig) {
      const inputConfig = nodeConfig as InputNodeConfig;
      let value: unknown = message;
      
      // Parse based on expected type
      if (inputConfig.expectedType === 'number' || inputConfig.expectedType === 'currency') {
        value = parseFloat(message.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
      } else if (inputConfig.expectedType === 'yes_no') {
        value = /^(sim|s|yes|y|1)$/i.test(message.trim());
      }

      setState(prev => ({
        ...prev,
        status: 'running',
        variables: {
          ...prev.variables,
          [inputConfig.variableName]: value,
        }
      }));

      addMessage('system', `✅ Variável ${inputConfig.variableName} = ${JSON.stringify(value)}`);
      
      const nextNode = getNextNode(currentNode.id);
      setTimeout(() => continueExecution(nextNode), 300);
    }
    // Handle condition node - evaluate and choose branch
    else if (nodeType === 'condition' && nodeConfig) {
      const condConfig = nodeConfig as ConditionNodeConfig;
      const lowerMessage = message.toLowerCase().trim();
      
      // Find matching branch
      let matchedBranchIndex = -1;
      
      for (let i = 0; i < (condConfig.branches || []).length; i++) {
        const branch = condConfig.branches[i];
        const branchKeywords = branch.keywords || [branch.value, branch.label];
        if (branchKeywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
          matchedBranchIndex = i;
          break;
        }
      }

      setState(prev => ({ ...prev, status: 'running' }));

      if (matchedBranchIndex >= 0) {
        const matchedBranch = condConfig.branches[matchedBranchIndex];
        addMessage('system', `➡️ Branch selecionada: ${matchedBranch.label}`);
        
        // Find edge with matching sourceHandle
        const edge = flow.edges.find(e => 
          e.source === currentNode.id && 
          (e.sourceHandle === `source-${matchedBranchIndex}` || 
           e.sourceHandle === matchedBranch.id)
        );
        
        if (edge) {
          const nextNode = flow.nodes.find(n => n.id === edge.target);
          setTimeout(() => continueExecution(nextNode || null), 300);
        } else {
          // Try first available edge from this node
          const anyEdge = flow.edges.find(e => e.source === currentNode.id);
          const nextNode = anyEdge ? flow.nodes.find(n => n.id === anyEdge.target) : null;
          setTimeout(() => continueExecution(nextNode), 300);
        }
      } else {
        addMessage('system', '⚠️ Nenhuma branch correspondente, usando primeira disponível');
        const nextNode = getNextNode(currentNode.id);
        setTimeout(() => continueExecution(nextNode), 300);
      }
    }
  }, [flow, state.status, state.currentNodeId, addMessage, getNextNode, continueExecution]);

  // Reset test
  const resetTest = useCallback(() => {
    autoModeRef.current = false;
    processingRef.current = false;
    setState(initialState);
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<TestConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return {
    // State
    status: state.status,
    currentNodeId: state.currentNodeId,
    variables: state.variables,
    messages: state.messages,
    executionLog: state.executionLog,
    visitedNodes: state.visitedNodes,
    error: state.error,
    config,
    
    // Actions
    startTest,
    sendTestMessage,
    resetTest,
    updateConfig,
  };
}
