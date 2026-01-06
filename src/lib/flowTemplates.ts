import { AIFlow, CustomFlowNode, CustomFlowEdge } from '@/types/flow';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'atendimento' | 'vendas' | 'confirmacao' | 'qualificacao';
  department: AIFlow['department'];
  nodes: CustomFlowNode[];
  edges: CustomFlowEdge[];
}

// Template 1: Confirmação de Imóvel
const confirmacaoImovelNodes: CustomFlowNode[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: {
      label: 'Início',
      config: { trigger: 'template_response' }
    }
  },
  {
    id: 'message-1',
    type: 'message',
    position: { x: 250, y: 150 },
    data: {
      label: 'Saudação',
      config: {
        text: 'Olá {{nome}}! 👋\n\nRecebemos sua resposta. Poderia confirmar se o imóvel ainda está disponível?',
        delay: 1,
        useClientName: true
      }
    }
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 250, y: 280 },
    data: {
      label: 'Verificar Resposta',
      config: {
        conditionType: 'keyword',
        keywords: ['sim', 'disponível', 'ainda', 'está', 'confirmo'],
        branches: [
          { id: 'yes', label: 'Disponível', value: 'yes' },
          { id: 'no', label: 'Indisponível', value: 'no' }
        ]
      }
    }
  },
  {
    id: 'action-1',
    type: 'action',
    position: { x: 100, y: 420 },
    data: {
      label: 'Atualizar Vista - Disponível',
      config: {
        actionType: 'update_vista',
        vistaFields: {
          propertyCode: '{{codigo_imovel}}',
          status: 'disponivel'
        }
      }
    }
  },
  {
    id: 'action-2',
    type: 'action',
    position: { x: 400, y: 420 },
    data: {
      label: 'Atualizar Vista - Indisponível',
      config: {
        actionType: 'update_vista',
        vistaFields: {
          propertyCode: '{{codigo_imovel}}',
          status: 'indisponivel'
        }
      }
    }
  },
  {
    id: 'message-2',
    type: 'message',
    position: { x: 100, y: 550 },
    data: {
      label: 'Confirmação Positiva',
      config: {
        text: 'Perfeito! ✅ Atualizamos o status do imóvel como disponível.\n\nObrigada pela confirmação!',
        delay: 0
      }
    }
  },
  {
    id: 'message-3',
    type: 'message',
    position: { x: 400, y: 550 },
    data: {
      label: 'Confirmação Negativa',
      config: {
        text: 'Entendido! 📝 Atualizamos o status do imóvel.\n\nObrigada pela informação!',
        delay: 0
      }
    }
  },
  {
    id: 'end-1',
    type: 'end',
    position: { x: 250, y: 680 },
    data: {
      label: 'Fim',
      config: {
        message: 'Tenha um ótimo dia! 🌟',
        closeConversation: false
      }
    }
  }
];

const confirmacaoImovelEdges: CustomFlowEdge[] = [
  { id: 'e1', source: 'start-1', target: 'message-1' },
  { id: 'e2', source: 'message-1', target: 'condition-1' },
  { id: 'e3', source: 'condition-1', target: 'action-1', sourceHandle: 'yes' },
  { id: 'e4', source: 'condition-1', target: 'action-2', sourceHandle: 'no' },
  { id: 'e5', source: 'action-1', target: 'message-2' },
  { id: 'e6', source: 'action-2', target: 'message-3' },
  { id: 'e7', source: 'message-2', target: 'end-1' },
  { id: 'e8', source: 'message-3', target: 'end-1' }
];

// Template 2: Qualificação de Lead
const qualificacaoLeadNodes: CustomFlowNode[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: {
      label: 'Início',
      config: { trigger: 'first_message' }
    }
  },
  {
    id: 'message-1',
    type: 'message',
    position: { x: 250, y: 150 },
    data: {
      label: 'Boas Vindas',
      config: {
        text: 'Olá! 👋 Seja bem-vindo(a) à nossa imobiliária!\n\nPara melhor atendê-lo(a), você está buscando imóvel para compra ou locação?',
        delay: 2,
        useClientName: false
      }
    }
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 250, y: 280 },
    data: {
      label: 'Tipo de Interesse',
      config: {
        conditionType: 'keyword',
        keywords: ['compra', 'comprar', 'adquirir', 'investir', 'investimento'],
        branches: [
          { id: 'compra', label: 'Compra', value: 'yes' },
          { id: 'locacao', label: 'Locação', value: 'no' }
        ]
      }
    }
  },
  {
    id: 'action-1',
    type: 'action',
    position: { x: 100, y: 420 },
    data: {
      label: 'Tag: Comprador',
      config: {
        actionType: 'update_contact',
        contactFields: { type: 'interessado' }
      }
    }
  },
  {
    id: 'action-2',
    type: 'action',
    position: { x: 400, y: 420 },
    data: {
      label: 'Tag: Inquilino',
      config: {
        actionType: 'update_contact',
        contactFields: { type: 'interessado' }
      }
    }
  },
  {
    id: 'escalation-1',
    type: 'escalation',
    position: { x: 100, y: 550 },
    data: {
      label: 'Escalar para Vendas',
      config: {
        department: 'vendas',
        priority: 'medium',
        reason: 'Lead interessado em compra - qualificado automaticamente'
      }
    }
  },
  {
    id: 'escalation-2',
    type: 'escalation',
    position: { x: 400, y: 550 },
    data: {
      label: 'Escalar para Locação',
      config: {
        department: 'locacao',
        priority: 'medium',
        reason: 'Lead interessado em locação - qualificado automaticamente'
      }
    }
  }
];

const qualificacaoLeadEdges: CustomFlowEdge[] = [
  { id: 'e1', source: 'start-1', target: 'message-1' },
  { id: 'e2', source: 'message-1', target: 'condition-1' },
  { id: 'e3', source: 'condition-1', target: 'action-1', sourceHandle: 'compra' },
  { id: 'e4', source: 'condition-1', target: 'action-2', sourceHandle: 'locacao' },
  { id: 'e5', source: 'action-1', target: 'escalation-1' },
  { id: 'e6', source: 'action-2', target: 'escalation-2' }
];

// Template 3: FAQ Automático
const faqAutomaticoNodes: CustomFlowNode[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: {
      label: 'Início',
      config: { trigger: 'keyword', keywords: ['horário', 'endereço', 'telefone', 'contato'] }
    }
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 250, y: 180 },
    data: {
      label: 'Tipo de Pergunta',
      config: {
        conditionType: 'keyword',
        keywords: ['horário', 'hora', 'funciona', 'atendimento'],
        branches: [
          { id: 'horario', label: 'Horário', value: 'yes' },
          { id: 'outro', label: 'Outro', value: 'no' }
        ]
      }
    }
  },
  {
    id: 'message-1',
    type: 'message',
    position: { x: 50, y: 320 },
    data: {
      label: 'Resposta Horário',
      config: {
        text: '🕐 Nosso horário de atendimento:\n\nSegunda a Sexta: 9h às 18h\nSábado: 9h às 13h\nDomingo e feriados: Fechado\n\nPosso ajudar com mais alguma coisa?',
        delay: 0
      }
    }
  },
  {
    id: 'condition-2',
    type: 'condition',
    position: { x: 400, y: 320 },
    data: {
      label: 'Endereço?',
      config: {
        conditionType: 'keyword',
        keywords: ['endereço', 'onde', 'localização', 'fica'],
        branches: [
          { id: 'endereco', label: 'Endereço', value: 'yes' },
          { id: 'outro', label: 'Outro', value: 'no' }
        ]
      }
    }
  },
  {
    id: 'message-2',
    type: 'message',
    position: { x: 300, y: 460 },
    data: {
      label: 'Resposta Endereço',
      config: {
        text: '📍 Nosso endereço:\n\nRua Example, 123 - Centro\nCidade/UF\nCEP: 00000-000\n\nPosso ajudar com mais alguma coisa?',
        delay: 0
      }
    }
  },
  {
    id: 'escalation-1',
    type: 'escalation',
    position: { x: 500, y: 460 },
    data: {
      label: 'Escalar Atendimento',
      config: {
        department: 'administrativo',
        priority: 'low',
        reason: 'Pergunta não identificada pelo FAQ automático'
      }
    }
  },
  {
    id: 'end-1',
    type: 'end',
    position: { x: 175, y: 580 },
    data: {
      label: 'Fim',
      config: {
        closeConversation: false
      }
    }
  }
];

const faqAutomaticoEdges: CustomFlowEdge[] = [
  { id: 'e1', source: 'start-1', target: 'condition-1' },
  { id: 'e2', source: 'condition-1', target: 'message-1', sourceHandle: 'horario' },
  { id: 'e3', source: 'condition-1', target: 'condition-2', sourceHandle: 'outro' },
  { id: 'e4', source: 'message-1', target: 'end-1' },
  { id: 'e5', source: 'condition-2', target: 'message-2', sourceHandle: 'endereco' },
  { id: 'e6', source: 'condition-2', target: 'escalation-1', sourceHandle: 'outro' },
  { id: 'e7', source: 'message-2', target: 'end-1' }
];

// Template 4: Agendamento de Visita
const agendamentoVisitaNodes: CustomFlowNode[] = [
  {
    id: 'start-1',
    type: 'start',
    position: { x: 250, y: 50 },
    data: {
      label: 'Início',
      config: { trigger: 'keyword', keywords: ['visita', 'agendar', 'ver', 'conhecer'] }
    }
  },
  {
    id: 'message-1',
    type: 'message',
    position: { x: 250, y: 150 },
    data: {
      label: 'Confirmar Interesse',
      config: {
        text: 'Ótimo! 🏠 Você gostaria de agendar uma visita ao imóvel?\n\nPor favor, me informe qual dia e horário seria melhor para você.',
        delay: 1
      }
    }
  },
  {
    id: 'delay-1',
    type: 'delay',
    position: { x: 250, y: 280 },
    data: {
      label: 'Aguardar Resposta',
      config: { duration: 5, unit: 'minutes' }
    }
  },
  {
    id: 'escalation-1',
    type: 'escalation',
    position: { x: 250, y: 400 },
    data: {
      label: 'Escalar para Corretor',
      config: {
        department: 'vendas',
        priority: 'high',
        reason: 'Cliente deseja agendar visita - prioridade alta'
      }
    }
  }
];

const agendamentoVisitaEdges: CustomFlowEdge[] = [
  { id: 'e1', source: 'start-1', target: 'message-1' },
  { id: 'e2', source: 'message-1', target: 'delay-1' },
  { id: 'e3', source: 'delay-1', target: 'escalation-1' }
];

export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'confirmacao-imovel',
    name: 'Confirmação de Imóvel',
    description: 'Fluxo para confirmar disponibilidade de imóveis com proprietários. Atualiza status no Vista automaticamente.',
    category: 'confirmacao',
    department: 'marketing',
    nodes: confirmacaoImovelNodes,
    edges: confirmacaoImovelEdges
  },
  {
    id: 'qualificacao-lead',
    name: 'Qualificação de Lead',
    description: 'Qualifica leads automaticamente perguntando se buscam compra ou locação, e direciona para o departamento correto.',
    category: 'qualificacao',
    department: 'marketing',
    nodes: qualificacaoLeadNodes,
    edges: qualificacaoLeadEdges
  },
  {
    id: 'faq-automatico',
    name: 'FAQ Automático',
    description: 'Responde perguntas frequentes sobre horário e endereço. Escala para humano quando não identifica a pergunta.',
    category: 'atendimento',
    department: 'administrativo',
    nodes: faqAutomaticoNodes,
    edges: faqAutomaticoEdges
  },
  {
    id: 'agendamento-visita',
    name: 'Agendamento de Visita',
    description: 'Inicia processo de agendamento de visita e escala para corretor com prioridade alta.',
    category: 'vendas',
    department: 'vendas',
    nodes: agendamentoVisitaNodes,
    edges: agendamentoVisitaEdges
  }
];

export function getTemplatesByCategory(category: FlowTemplate['category']): FlowTemplate[] {
  return FLOW_TEMPLATES.filter(t => t.category === category);
}

export function getTemplateById(id: string): FlowTemplate | undefined {
  return FLOW_TEMPLATES.find(t => t.id === id);
}
