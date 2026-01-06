import { Node, Edge } from '@xyflow/react';

// Tipos de nós disponíveis no Flow Builder
export type FlowNodeType = 
  | 'start'
  | 'message'
  | 'condition'
  | 'action'
  | 'escalation'
  | 'integration'
  | 'delay'
  | 'input'
  | 'end';

// Configuração específica para cada tipo de nó
export interface StartNodeConfig {
  trigger: 'first_message' | 'keyword' | 'template_response';
  keywords?: string[];
  templateId?: string;
}

export interface MessageNodeConfig {
  text: string;
  delay?: number;
  useClientName?: boolean;
}

// Branch com keywords individuais para detecção semântica
export interface ConditionBranch {
  id: string;
  label: string;
  value: string;
  keywords?: string[]; // Keywords específicas para esta branch
}

export interface ConditionNodeConfig {
  conditionType: 'keyword' | 'intent' | 'time' | 'tag' | 'variable';
  keywords?: string[]; // Keywords globais (legado)
  intent?: string;
  timeRange?: { start: string; end: string };
  variableName?: string; // Para checar valor de variável
  branches: ConditionBranch[];
}

export interface ActionNodeConfig {
  actionType: 'update_vista' | 'add_tag' | 'remove_tag' | 'update_contact' | 'set_variable';
  vistaFields?: Record<string, string>;
  tagId?: string;
  contactFields?: Record<string, string>;
  variableName?: string;
  variableValue?: string;
}

export interface EscalationNodeConfig {
  department: 'locacao' | 'vendas' | 'administrativo' | 'marketing';
  priority: 'low' | 'medium' | 'high';
  reason?: string;
}

export interface IntegrationNodeConfig {
  integrationType: 'webhook' | 'n8n' | 'api';
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
}

export interface DelayNodeConfig {
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours';
}

// Novo: Input Node para capturar resposta do usuário
export interface InputNodeConfig {
  variableName: string;
  expectedType: 'text' | 'number' | 'currency' | 'yes_no' | 'email' | 'phone';
  prompt?: string; // Mensagem opcional antes de capturar
  timeout?: number; // Segundos para timeout
  timeoutAction?: 'retry' | 'skip' | 'escalate';
}

export interface EndNodeConfig {
  message?: string;
  closeConversation?: boolean;
}

// União de todas as configurações
export type FlowNodeConfig = 
  | StartNodeConfig
  | MessageNodeConfig
  | ConditionNodeConfig
  | ActionNodeConfig
  | EscalationNodeConfig
  | IntegrationNodeConfig
  | DelayNodeConfig
  | InputNodeConfig
  | EndNodeConfig;

// Dados do nó no React Flow
export interface FlowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  config: FlowNodeConfig;
}

// Tipo customizado do nó para React Flow
export type CustomFlowNode = Node<FlowNodeData>;

// Tipo customizado da aresta para React Flow
export interface CustomFlowEdge extends Edge {
  label?: string;
  animated?: boolean;
}

// Estrutura completa do fluxo
export interface AIFlow {
  id: string;
  name: string;
  description?: string;
  department: 'locacao' | 'vendas' | 'administrativo' | 'marketing';
  nodes: CustomFlowNode[];
  edges: CustomFlowEdge[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Item do painel de nós (para arrastar)
export interface NodePaletteItem {
  type: FlowNodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
}

// Definição dos itens do painel
export const NODE_PALETTE_ITEMS: NodePaletteItem[] = [
  {
    type: 'start',
    label: 'Início',
    description: 'Ponto de entrada do fluxo',
    icon: 'Play',
    color: 'bg-green-500'
  },
  {
    type: 'message',
    label: 'Mensagem',
    description: 'Enviar mensagem ao cliente',
    icon: 'MessageCircle',
    color: 'bg-blue-500'
  },
  {
    type: 'input',
    label: 'Capturar Resposta',
    description: 'Aguardar e capturar resposta',
    icon: 'TextCursor',
    color: 'bg-cyan-500'
  },
  {
    type: 'condition',
    label: 'Condição',
    description: 'Decisão baseada em regras',
    icon: 'GitBranch',
    color: 'bg-yellow-500'
  },
  {
    type: 'action',
    label: 'Ação',
    description: 'Executar ação (Vista, tags, etc)',
    icon: 'Zap',
    color: 'bg-purple-500'
  },
  {
    type: 'escalation',
    label: 'Escalar',
    description: 'Transferir para humano',
    icon: 'UserPlus',
    color: 'bg-orange-500'
  },
  {
    type: 'integration',
    label: 'Integração',
    description: 'Chamar API ou webhook',
    icon: 'Webhook',
    color: 'bg-indigo-500'
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Aguardar antes de continuar',
    icon: 'Clock',
    color: 'bg-slate-500'
  },
  {
    type: 'end',
    label: 'Fim',
    description: 'Encerrar o fluxo',
    icon: 'Square',
    color: 'bg-red-500'
  }
];
