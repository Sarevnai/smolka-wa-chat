import { AIFlow, CustomFlowNode, CustomFlowEdge, ConditionBranch } from '@/types/flow';

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'atendimento' | 'vendas' | 'confirmacao' | 'qualificacao' | 'proprietarios';
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
  { id: 'e3', source: 'condition-1', target: 'action-1', sourceHandle: 'branch-yes' },
  { id: 'e4', source: 'condition-1', target: 'action-2', sourceHandle: 'branch-no' },
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
        branches: [
          { id: 'compra', label: 'Compra', value: 'compra', keywords: ['compra', 'comprar', 'adquirir', 'investir', 'investimento'] },
          { id: 'locacao', label: 'Locação', value: 'locacao', keywords: ['locação', 'alugar', 'aluguel', 'locar'] }
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
  { id: 'e3', source: 'condition-1', target: 'action-1', sourceHandle: 'branch-compra' },
  { id: 'e4', source: 'condition-1', target: 'action-2', sourceHandle: 'branch-locacao' },
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
        branches: [
          { id: 'horario', label: 'Horário', value: 'horario', keywords: ['horário', 'hora', 'funciona', 'atendimento'] },
          { id: 'outro', label: 'Outro', value: 'outro', keywords: [] }
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
        branches: [
          { id: 'endereco', label: 'Endereço', value: 'endereco', keywords: ['endereço', 'onde', 'localização', 'fica'] },
          { id: 'outro', label: 'Outro', value: 'outro', keywords: [] }
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
  { id: 'e2', source: 'condition-1', target: 'message-1', sourceHandle: 'branch-horario' },
  { id: 'e3', source: 'condition-1', target: 'condition-2', sourceHandle: 'branch-outro' },
  { id: 'e4', source: 'message-1', target: 'end-1' },
  { id: 'e5', source: 'condition-2', target: 'message-2', sourceHandle: 'branch-endereco' },
  { id: 'e6', source: 'condition-2', target: 'escalation-1', sourceHandle: 'branch-outro' },
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

// =============================================
// Template 5: ATUALIZAÇÃO DE PROPRIETÁRIOS
// Fluxo completo com 5 cenários
// =============================================

const atualizacaoProprietariosNodes: CustomFlowNode[] = [
  // INÍCIO
  {
    id: 'start-1',
    type: 'start',
    position: { x: 400, y: 50 },
    data: {
      label: 'Início - Resposta Template',
      config: { trigger: 'template_response' }
    }
  },

  // CONDIÇÃO PRINCIPAL - Detectar cenário
  {
    id: 'condition-principal',
    type: 'condition',
    position: { x: 400, y: 150 },
    data: {
      label: 'Identificar Situação',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'desistiu', 
            label: 'Desistiu', 
            value: 'desistiu',
            keywords: ['desisti', 'não quero mais', 'não vou vender', 'alugou', 'aluguei', 'desistência', 'retirar']
          },
          { 
            id: 'vendeu', 
            label: 'Já Vendeu', 
            value: 'vendeu',
            keywords: ['vendi', 'vendeu', 'já vendi', 'vendido', 'foi vendido', 'consegui vender']
          },
          { 
            id: 'aumentou', 
            label: 'Aumentou Valor', 
            value: 'aumentou',
            keywords: ['aumentei', 'valor maior', 'subiu', 'ajustei para cima', 'reajuste', 'novo valor maior']
          },
          { 
            id: 'baixou', 
            label: 'Baixou Valor', 
            value: 'baixou',
            keywords: ['baixei', 'reduzi', 'diminui', 'valor menor', 'abaixar', 'redução']
          },
          { 
            id: 'mantem', 
            label: 'Mantém à Venda', 
            value: 'mantem',
            keywords: ['continua', 'mantém', 'disponível', 'ainda', 'sim', 'está disponível', 'mantém disponível']
          }
        ] as ConditionBranch[]
      }
    }
  },

  // =============================================
  // CENÁRIO 1: DESISTIU DA VENDA
  // =============================================
  {
    id: 'msg-desistiu',
    type: 'message',
    position: { x: 0, y: 300 },
    data: {
      label: 'Resposta Desistência',
      config: {
        text: 'Entendi, sem problema.\n\nNesse caso, iremos retirar o imóvel da nossa pauta.\n\nCaso futuramente deseje voltar a anunciar este imóvel, seja para venda ou locação, ou se tiver outros imóveis, é só entrar em contato conosco que ativamos o anúncio novamente.\n\nFicamos à disposição.',
        delay: 1
      }
    }
  },
  {
    id: 'action-desistiu',
    type: 'action',
    position: { x: 0, y: 450 },
    data: {
      label: 'Atualizar Vista - Retirar',
      config: {
        actionType: 'update_vista',
        vistaFields: {
          propertyCode: '{{codigo_imovel}}',
          status: 'retirado'
        }
      }
    }
  },
  {
    id: 'end-desistiu',
    type: 'end',
    position: { x: 0, y: 580 },
    data: {
      label: 'Fim - Desistência',
      config: { closeConversation: true }
    }
  },

  // =============================================
  // CENÁRIO 2: JÁ VENDEU
  // =============================================
  {
    id: 'msg-vendeu-1',
    type: 'message',
    position: { x: 200, y: 300 },
    data: {
      label: 'Confirma Venda + Oferta',
      config: {
        text: 'Perfeito, obrigada pelo retorno.\n\nEntão, vamos retirar o anúncio de pauta.\n\nAproveitando, após a venda deste imóvel, o senhor está buscando alguma oportunidade para investimento?\n\nHoje, a Smolka Imóveis conta com mais de 3.300 imóveis na pauta. O senhor está em busca de algo no momento?',
        delay: 1
      }
    }
  },
  {
    id: 'action-vendeu',
    type: 'action',
    position: { x: 200, y: 450 },
    data: {
      label: 'Atualizar Vista - Vendido',
      config: {
        actionType: 'update_vista',
        vistaFields: {
          propertyCode: '{{codigo_imovel}}',
          status: 'vendido'
        }
      }
    }
  },
  {
    id: 'condition-investimento',
    type: 'condition',
    position: { x: 200, y: 580 },
    data: {
      label: 'Interesse Investimento?',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'sim', 
            label: 'Sim', 
            value: 'sim',
            keywords: ['sim', 'quero', 'tenho interesse', 'pode ser', 'ok', 'vamos', 'estou', 'busco']
          },
          { 
            id: 'nao', 
            label: 'Não', 
            value: 'nao',
            keywords: ['não', 'nao', 'agora não', 'no momento não', 'sem interesse', 'obrigado']
          }
        ] as ConditionBranch[]
      }
    }
  },
  {
    id: 'msg-vendeu-sim',
    type: 'message',
    position: { x: 120, y: 730 },
    data: {
      label: 'Resposta SIM Investimento',
      config: {
        text: 'Perfeito.\n\nVou direcionar um corretor para entender melhor o perfil do investimento que o senhor busca e dar continuidade ao atendimento.\n\nEm breve ele entrará em contato. Obrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'escalation-vendas',
    type: 'escalation',
    position: { x: 120, y: 870 },
    data: {
      label: 'Escalar para Vendas',
      config: {
        department: 'vendas',
        priority: 'high',
        reason: 'Proprietário vendeu e tem interesse em investir'
      }
    }
  },
  {
    id: 'msg-vendeu-nao',
    type: 'message',
    position: { x: 280, y: 730 },
    data: {
      label: 'Resposta NÃO Investimento',
      config: {
        text: 'Sem problema 😊\n\nObrigada pelas informações. Caso futuramente tenha outros imóveis para venda ou locação, ou venha buscar novas oportunidades de investimento, entre em contato com a Smolka Imóveis que estaremos à disposição para futuros negócios.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'end-vendeu-nao',
    type: 'end',
    position: { x: 280, y: 870 },
    data: {
      label: 'Fim - Sem Interesse',
      config: { closeConversation: true }
    }
  },

  // =============================================
  // CENÁRIO 3: AUMENTOU O VALOR
  // =============================================
  {
    id: 'condition-valor-aumentou',
    type: 'condition',
    position: { x: 400, y: 300 },
    data: {
      label: 'Informou Novo Valor?',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'com-valor', 
            label: 'Com Valor', 
            value: 'com-valor',
            keywords: ['mil', 'milhão', 'reais', 'R$', '000', '.000']
          },
          { 
            id: 'sem-valor', 
            label: 'Sem Valor', 
            value: 'sem-valor',
            keywords: []
          }
        ] as ConditionBranch[]
      }
    }
  },
  {
    id: 'msg-aumentou-com-valor',
    type: 'message',
    position: { x: 350, y: 450 },
    data: {
      label: 'Confirma Aumento',
      config: {
        text: 'Certo, obrigada pelo retorno.\n\nVamos atualizar o ajuste de valor no sistema, mantendo o imóvel disponível para venda.\n\nCaso surjam contatos para visitas, entro em contato novamente.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'input-valor-aumentou',
    type: 'input',
    position: { x: 450, y: 450 },
    data: {
      label: 'Capturar Novo Valor',
      config: {
        variableName: 'novo_valor',
        expectedType: 'currency',
        timeout: 300,
        timeoutAction: 'retry'
      }
    }
  },
  {
    id: 'msg-pedir-valor-aumentou',
    type: 'message',
    position: { x: 450, y: 580 },
    data: {
      label: 'Solicitar Valor',
      config: {
        text: 'Certo, então o imóvel continua disponível para venda.\n\nPoderia me informar, por gentileza, qual é o valor atualizado, já considerando a comissão de 6%?\n\nAssim que me confirmar, farei a atualização no sistema e, caso surjam possibilidades de visita, entro em contato novamente.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'action-aumentou',
    type: 'action',
    position: { x: 400, y: 730 },
    data: {
      label: 'Atualizar Vista - Valor',
      config: {
        actionType: 'update_vista',
        vistaFields: {
          propertyCode: '{{codigo_imovel}}',
          value: '{{novo_valor}}'
        }
      }
    }
  },
  {
    id: 'end-aumentou',
    type: 'end',
    position: { x: 400, y: 870 },
    data: {
      label: 'Fim - Valor Atualizado',
      config: { closeConversation: false }
    }
  },

  // =============================================
  // CENÁRIO 4: BAIXOU O VALOR
  // =============================================
  {
    id: 'condition-valor-baixou',
    type: 'condition',
    position: { x: 600, y: 300 },
    data: {
      label: 'Informou Novo Valor?',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'com-valor', 
            label: 'Com Valor', 
            value: 'com-valor',
            keywords: ['mil', 'milhão', 'reais', 'R$', '000', '.000']
          },
          { 
            id: 'sem-valor', 
            label: 'Sem Valor', 
            value: 'sem-valor',
            keywords: []
          }
        ] as ConditionBranch[]
      }
    }
  },
  {
    id: 'msg-baixou-com-valor',
    type: 'message',
    position: { x: 550, y: 450 },
    data: {
      label: 'Confirma Redução',
      config: {
        text: 'Ótimo, a redução de valor ajuda bastante a esquentar o anúncio e aumentar as chances de novos contatos e visitas.\n\nVou atualizar o valor no sistema, já considerando a comissão de 6%.\n\nCaso apareça alguma possibilidade de visita, entro em contato novamente.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'input-valor-baixou',
    type: 'input',
    position: { x: 650, y: 450 },
    data: {
      label: 'Capturar Novo Valor',
      config: {
        variableName: 'novo_valor',
        expectedType: 'currency',
        timeout: 300,
        timeoutAction: 'retry'
      }
    }
  },
  {
    id: 'msg-pedir-valor-baixou',
    type: 'message',
    position: { x: 650, y: 580 },
    data: {
      label: 'Solicitar Valor',
      config: {
        text: 'Ótimo, a redução de valor realmente ajuda a gerar mais interesse no anúncio.\n\nPoderia me informar, por gentileza, qual é o valor atual, para que eu possa atualizar no sistema, já considerando a comissão de 6%?\n\nAssim que atualizado, caso surjam possibilidades de visita, entro em contato novamente.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'action-baixou',
    type: 'action',
    position: { x: 600, y: 730 },
    data: {
      label: 'Atualizar Vista - Valor Reduzido',
      config: {
        actionType: 'update_vista',
        vistaFields: {
          propertyCode: '{{codigo_imovel}}',
          value: '{{novo_valor}}'
        }
      }
    }
  },
  {
    id: 'end-baixou',
    type: 'end',
    position: { x: 600, y: 870 },
    data: {
      label: 'Fim - Valor Reduzido',
      config: { closeConversation: false }
    }
  },

  // =============================================
  // CENÁRIO 5: MANTÉM À VENDA - SONDAGEM LOCAÇÃO
  // =============================================
  {
    id: 'msg-mantem-pergunta',
    type: 'message',
    position: { x: 800, y: 300 },
    data: {
      label: 'Pergunta Ocupação',
      config: {
        text: 'Aproveitando, gostaria de confirmar uma informação: esse imóvel está desocupado no momento, está com inquilino ou o senhor reside no local?',
        delay: 1
      }
    }
  },
  {
    id: 'condition-ocupacao',
    type: 'condition',
    position: { x: 800, y: 450 },
    data: {
      label: 'Situação do Imóvel',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'desocupado', 
            label: 'Desocupado', 
            value: 'desocupado',
            keywords: ['desocupado', 'vazio', 'sem ninguém', 'não tem ninguém', 'está vago']
          },
          { 
            id: 'ocupado', 
            label: 'Ocupado/Mora', 
            value: 'ocupado',
            keywords: ['inquilino', 'alugado', 'moro', 'resido', 'morando', 'ocupado']
          }
        ] as ConditionBranch[]
      }
    }
  },
  // Se ocupado - finaliza mantendo só venda
  {
    id: 'msg-ocupado-fim',
    type: 'message',
    position: { x: 900, y: 600 },
    data: {
      label: 'Mantém só Venda',
      config: {
        text: 'Entendido, obrigada pela informação.\n\nVamos manter o imóvel disponível para venda. Caso surja alguma possibilidade de visita, entro em contato novamente.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'end-ocupado',
    type: 'end',
    position: { x: 900, y: 750 },
    data: {
      label: 'Fim - Só Venda',
      config: { closeConversation: false }
    }
  },
  // Se desocupado - pergunta sobre locação
  {
    id: 'msg-pergunta-locacao',
    type: 'message',
    position: { x: 700, y: 600 },
    data: {
      label: 'Oferta Locação',
      config: {
        text: 'Certo, obrigada pela confirmação.\n\nNesse caso, gostaria de verificar se o senhor teria interesse em colocar o imóvel também para locação, além de mantê-lo à venda.',
        delay: 1
      }
    }
  },
  {
    id: 'condition-interesse-locacao',
    type: 'condition',
    position: { x: 700, y: 750 },
    data: {
      label: 'Interesse em Locação?',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'sim', 
            label: 'Sim', 
            value: 'sim',
            keywords: ['sim', 'quero', 'tenho interesse', 'pode ser', 'ok', 'vamos', 'gostaria']
          },
          { 
            id: 'nao', 
            label: 'Não', 
            value: 'nao',
            keywords: ['não', 'nao', 'agora não', 'no momento não', 'sem interesse', 'só venda']
          }
        ] as ConditionBranch[]
      }
    }
  },
  // Se SIM interesse locação
  {
    id: 'msg-locacao-sim',
    type: 'message',
    position: { x: 600, y: 900 },
    data: {
      label: 'Encaminhar Locação',
      config: {
        text: 'Perfeito.\n\nVou direcionar para o nosso setor de locação, para que possam explicar como funciona o processo, as taxas, a administração e esclarecer todas as dúvidas necessárias.\n\nEm breve o atendimento de locação entra em contato. Obrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'escalation-locacao',
    type: 'escalation',
    position: { x: 600, y: 1050 },
    data: {
      label: 'Escalar para Locação',
      config: {
        department: 'locacao',
        priority: 'medium',
        reason: 'Proprietário com interesse em colocar imóvel para locação além de venda'
      }
    }
  },
  // Se NÃO interesse locação - argumentação
  {
    id: 'msg-argumentacao',
    type: 'message',
    position: { x: 800, y: 900 },
    data: {
      label: 'Argumentação Estratégica',
      config: {
        text: 'Entendo perfeitamente.\n\nApenas para contextualizar: ao colocar o imóvel também para locação, ele deixa de gerar apenas despesas e passa a gerar uma receita mensal, por meio do aluguel.\n\nAlém disso, despesas como condomínio, IPTU, conservação e manutenção passam a ser de responsabilidade do inquilino, reduzindo significativamente os custos do proprietário.\n\nMuitos proprietários acreditam que alugar o imóvel dificulta a venda, mas na prática acontece o contrário. Aqui na Smolka Imóveis, temos diversos clientes investidores que buscam exclusivamente imóveis já alugados, justamente pela rentabilidade e segurança do investimento.\n\nInclusive, por lei, o inquilino tem preferência de compra. Caso ele não tenha interesse, existe um prazo legal de até 90 dias para desocupação, se houver a venda.\n\nOu seja, o imóvel pode ser vendido normalmente mesmo estando alugado, ao mesmo tempo em que gera renda e elimina despesas enquanto isso.',
        delay: 2
      }
    }
  },
  {
    id: 'msg-pergunta-final',
    type: 'message',
    position: { x: 800, y: 1050 },
    data: {
      label: 'Pergunta Final',
      config: {
        text: 'Diante disso, o que acha? Vamos colocar o imóvel também para locação, além da venda?',
        delay: 1
      }
    }
  },
  {
    id: 'condition-final',
    type: 'condition',
    position: { x: 800, y: 1180 },
    data: {
      label: 'Decisão Final',
      config: {
        conditionType: 'keyword',
        branches: [
          { 
            id: 'sim', 
            label: 'Aceita', 
            value: 'sim',
            keywords: ['sim', 'quero', 'vamos', 'pode', 'ok', 'tudo bem', 'fechado']
          },
          { 
            id: 'nao', 
            label: 'Recusa', 
            value: 'nao',
            keywords: ['não', 'nao', 'prefiro não', 'só venda', 'mantem assim']
          }
        ] as ConditionBranch[]
      }
    }
  },
  {
    id: 'msg-final-sim',
    type: 'message',
    position: { x: 700, y: 1330 },
    data: {
      label: 'Aceita Locação',
      config: {
        text: 'Perfeito.\n\nVou direcionar para o nosso setor de locação para dar continuidade e esclarecer todos os detalhes.\n\nObrigada!',
        delay: 1
      }
    }
  },
  {
    id: 'escalation-locacao-2',
    type: 'escalation',
    position: { x: 700, y: 1480 },
    data: {
      label: 'Escalar para Locação',
      config: {
        department: 'locacao',
        priority: 'medium',
        reason: 'Proprietário aceitou colocar imóvel para locação após argumentação'
      }
    }
  },
  {
    id: 'msg-final-nao',
    type: 'message',
    position: { x: 900, y: 1330 },
    data: {
      label: 'Mantém só Venda Final',
      config: {
        text: 'Sem problema, agradeço o retorno.\n\nVamos então manter a disponibilidade apenas para venda. Caso surja alguma possibilidade de visita, entro em contato novamente.',
        delay: 1
      }
    }
  },
  {
    id: 'end-final-nao',
    type: 'end',
    position: { x: 900, y: 1480 },
    data: {
      label: 'Fim - Só Venda',
      config: { closeConversation: false }
    }
  }
];

const atualizacaoProprietariosEdges: CustomFlowEdge[] = [
  // Início
  { id: 'e-start', source: 'start-1', target: 'condition-principal' },
  
  // Branches principais
  { id: 'e-desistiu', source: 'condition-principal', target: 'msg-desistiu', sourceHandle: 'branch-desistiu' },
  { id: 'e-vendeu', source: 'condition-principal', target: 'msg-vendeu-1', sourceHandle: 'branch-vendeu' },
  { id: 'e-aumentou', source: 'condition-principal', target: 'condition-valor-aumentou', sourceHandle: 'branch-aumentou' },
  { id: 'e-baixou', source: 'condition-principal', target: 'condition-valor-baixou', sourceHandle: 'branch-baixou' },
  { id: 'e-mantem', source: 'condition-principal', target: 'msg-mantem-pergunta', sourceHandle: 'branch-mantem' },

  // Cenário 1 - Desistiu
  { id: 'e-desistiu-1', source: 'msg-desistiu', target: 'action-desistiu' },
  { id: 'e-desistiu-2', source: 'action-desistiu', target: 'end-desistiu' },

  // Cenário 2 - Vendeu
  { id: 'e-vendeu-1', source: 'msg-vendeu-1', target: 'action-vendeu' },
  { id: 'e-vendeu-2', source: 'action-vendeu', target: 'condition-investimento' },
  { id: 'e-vendeu-sim', source: 'condition-investimento', target: 'msg-vendeu-sim', sourceHandle: 'branch-sim' },
  { id: 'e-vendeu-nao', source: 'condition-investimento', target: 'msg-vendeu-nao', sourceHandle: 'branch-nao' },
  { id: 'e-vendeu-sim-2', source: 'msg-vendeu-sim', target: 'escalation-vendas' },
  { id: 'e-vendeu-nao-2', source: 'msg-vendeu-nao', target: 'end-vendeu-nao' },

  // Cenário 3 - Aumentou
  { id: 'e-aumentou-com', source: 'condition-valor-aumentou', target: 'msg-aumentou-com-valor', sourceHandle: 'branch-com-valor' },
  { id: 'e-aumentou-sem', source: 'condition-valor-aumentou', target: 'input-valor-aumentou', sourceHandle: 'branch-sem-valor' },
  { id: 'e-aumentou-input', source: 'input-valor-aumentou', target: 'msg-pedir-valor-aumentou' },
  { id: 'e-aumentou-com-2', source: 'msg-aumentou-com-valor', target: 'action-aumentou' },
  { id: 'e-aumentou-sem-2', source: 'msg-pedir-valor-aumentou', target: 'action-aumentou' },
  { id: 'e-aumentou-3', source: 'action-aumentou', target: 'end-aumentou' },

  // Cenário 4 - Baixou
  { id: 'e-baixou-com', source: 'condition-valor-baixou', target: 'msg-baixou-com-valor', sourceHandle: 'branch-com-valor' },
  { id: 'e-baixou-sem', source: 'condition-valor-baixou', target: 'input-valor-baixou', sourceHandle: 'branch-sem-valor' },
  { id: 'e-baixou-input', source: 'input-valor-baixou', target: 'msg-pedir-valor-baixou' },
  { id: 'e-baixou-com-2', source: 'msg-baixou-com-valor', target: 'action-baixou' },
  { id: 'e-baixou-sem-2', source: 'msg-pedir-valor-baixou', target: 'action-baixou' },
  { id: 'e-baixou-3', source: 'action-baixou', target: 'end-baixou' },

  // Cenário 5 - Mantém
  { id: 'e-mantem-1', source: 'msg-mantem-pergunta', target: 'condition-ocupacao' },
  { id: 'e-ocupado', source: 'condition-ocupacao', target: 'msg-ocupado-fim', sourceHandle: 'branch-ocupado' },
  { id: 'e-ocupado-2', source: 'msg-ocupado-fim', target: 'end-ocupado' },
  { id: 'e-desocupado', source: 'condition-ocupacao', target: 'msg-pergunta-locacao', sourceHandle: 'branch-desocupado' },
  { id: 'e-locacao-1', source: 'msg-pergunta-locacao', target: 'condition-interesse-locacao' },
  { id: 'e-locacao-sim', source: 'condition-interesse-locacao', target: 'msg-locacao-sim', sourceHandle: 'branch-sim' },
  { id: 'e-locacao-sim-2', source: 'msg-locacao-sim', target: 'escalation-locacao' },
  { id: 'e-locacao-nao', source: 'condition-interesse-locacao', target: 'msg-argumentacao', sourceHandle: 'branch-nao' },
  { id: 'e-argumentacao', source: 'msg-argumentacao', target: 'msg-pergunta-final' },
  { id: 'e-pergunta-final', source: 'msg-pergunta-final', target: 'condition-final' },
  { id: 'e-final-sim', source: 'condition-final', target: 'msg-final-sim', sourceHandle: 'branch-sim' },
  { id: 'e-final-sim-2', source: 'msg-final-sim', target: 'escalation-locacao-2' },
  { id: 'e-final-nao', source: 'condition-final', target: 'msg-final-nao', sourceHandle: 'branch-nao' },
  { id: 'e-final-nao-2', source: 'msg-final-nao', target: 'end-final-nao' }
];


export const FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'atualizacao-proprietarios',
    name: 'Atualização de Proprietários',
    description: 'Fluxo completo para atualização de status de imóveis com proprietários. Cobre 5 cenários: desistência, venda, aumento de valor, redução de valor e sondagem para locação.',
    category: 'proprietarios',
    department: 'vendas',
    nodes: atualizacaoProprietariosNodes,
    edges: atualizacaoProprietariosEdges
  },
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
