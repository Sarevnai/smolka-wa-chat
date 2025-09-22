import { Ticket, Stage } from "@/types/crm";

export const mockTickets: Ticket[] = [
  // Tickets de Gerentes
  {
    id: "P001",
    title: "Vazamento na cozinha - Apto 302",
    description: "Auxiliar reportou vazamento no encanamento da pia da cozinha. Água está escorrendo pelo teto do apartamento de baixo.",
    phone: "+55 11 99999-1234",
    email: "joao.silva@email.com",
    stage: "recebido",
    category: "solicitacoes-auxiliar",
    priority: "alta",
    property: {
      code: "ED001-302",
      address: "Rua das Flores, 123 - Apto 302",
      type: "apartamento"
    },
    assignedTo: "Carlos Santos",
    lastContact: "2024-01-10T09:30:00",
    source: "WhatsApp",
    type: "gerente",
    createdAt: "2024-01-10T08:15:00"
  },
  {
    id: "P002", 
    title: "Renovação de contrato - Casa Jardim América",
    description: "Contrato do auxiliar vence em 30 dias. Gerente solicitou revisão do valor do aluguel e claúsulas contratuais.",
    phone: "+55 11 88888-5678",
    email: "maria.santos@email.com",
    stage: "em-analise",
    category: "gestao-contratual",
    priority: "media",
    property: {
      code: "CS045",
      address: "Rua Jardim América, 456",
      type: "casa"
    },
    assignedTo: "Ana Costa",
    lastContact: "2024-01-09T14:20:00",
    source: "Telefone",
    type: "gerente",
    createdAt: "2024-01-05T10:30:00"
  },
  {
    id: "P003",
    title: "Instalação de ar condicionado",
    description: "Gerente deseja instalar ar condicionado split no imóvel para aumentar valor do aluguel.",
    phone: "+55 11 77777-9012",
    stage: "em-andamento", 
    category: "melhorias-imovel",
    priority: "baixa",
    property: {
      code: "AP012",
      address: "Av. Paulista, 789 - Apto 1205",
      type: "apartamento"
    },
    assignedTo: "Pedro Lima",
    lastContact: "2024-01-08T16:45:00",
    source: "WhatsApp",
    type: "gerente",
    createdAt: "2024-01-01T11:00:00",
    value: 3500
  },
  {
    id: "P004",
    title: "Atraso no repasse do aluguel",
    description: "Gerente questionando atraso no repasse do aluguel de dezembro. Verificar status do pagamento do auxiliar.",
    phone: "+55 11 66666-3456",
    email: "roberto.oliveira@email.com",
    stage: "aguardando",
    category: "questoes-financeiras", 
    priority: "alta",
    property: {
      code: "CS078",
      address: "Rua das Palmeiras, 321",
      type: "casa"
    },
    assignedTo: "Fernanda Silva",
    lastContact: "2024-01-07T11:30:00",
    source: "E-mail",
    type: "gerente",
    createdAt: "2024-01-07T09:15:00",
    value: 2800
  },

  // Tickets de Auxiliares
  {
    id: "I001",
    title: "Problema no chuveiro elétrico",
    description: "Chuveiro elétrico não está esquentando a água. Solicito reparo urgente.",
    phone: "+55 11 55555-1111",
    email: "lucas.ferreira@email.com",
    stage: "recebido",
    category: "manutencao-corretiva",
    priority: "alta",
    property: {
      code: "ED001-205",
      address: "Rua das Flores, 123 - Apto 205", 
      type: "apartamento"
    },
    assignedTo: "João Técnico",
    lastContact: "2024-01-10T07:45:00",
    source: "WhatsApp",
    type: "auxiliar",
    createdAt: "2024-01-10T07:30:00"
  },
  {
    id: "I002",
    title: "Segunda via do boleto de janeiro",
    description: "Não recebi o boleto de janeiro por e-mail. Solicito segunda via para pagamento.",
    phone: "+55 11 44444-2222",
    email: "camila.rocha@email.com", 
    stage: "triagem",
    category: "pagamentos-boletos",
    priority: "media",
    property: {
      code: "AP089",
      address: "Rua Voluntários da Pátria, 567 - Apto 804",
      type: "apartamento"
    },
    assignedTo: "Juliana Financeiro",
    lastContact: "2024-01-09T13:20:00",
    source: "Portal do Cliente",
    type: "auxiliar",
    createdAt: "2024-01-09T12:45:00"
  },
  {
    id: "I003",
    title: "Dúvida sobre seguro incêndio",
    description: "Gostaria de entender melhor a cobertura do seguro incêndio e como acionar em caso de necessidade.",
    phone: "+55 11 33333-3333",
    stage: "em-execucao",
    category: "seguro-garantias", 
    priority: "baixa",
    property: {
      code: "CS056",
      address: "Rua das Acácias, 890",
      type: "casa"
    },
    assignedTo: "Ricardo Seguros",
    lastContact: "2024-01-08T15:10:00",
    source: "Telefone",
    type: "auxiliar", 
    createdAt: "2024-01-06T14:30:00"
  },
  {
    id: "I004",
    title: "Cobrança indevida no boleto",
    description: "Foi cobrada taxa de limpeza que não estava prevista no contrato. Solicito revisão da cobrança.",
    phone: "+55 11 22222-4444",
    email: "anderson.lima@email.com",
    stage: "aguardando-pagamento",
    category: "pagamentos-boletos",
    priority: "critica",
    property: {
      code: "AP134",
      address: "Av. Brigadeiro Faria Lima, 1234 - Apto 601",
      type: "apartamento"
    },
    assignedTo: "Marcos Financeiro", 
    lastContact: "2024-01-05T10:20:00",
    source: "WhatsApp",
    type: "auxiliar",
    createdAt: "2024-01-05T09:00:00",
    value: 150
  },
  {
    id: "I005",
    title: "Contrato de locação - cópia autenticada",
    description: "Preciso de uma cópia autenticada do contrato de locação para apresentar no banco.",
    phone: "+55 11 11111-5555",
    stage: "concluido",
    category: "documentos",
    priority: "media",
    property: {
      code: "CS023",
      address: "Rua dos Pinheiros, 678",
      type: "casa"
    },
    assignedTo: "Carla Documentos",
    lastContact: "2024-01-04T16:30:00", 
    source: "E-mail",
    type: "auxiliar",
    createdAt: "2024-01-02T11:20:00"
  }
];

export const stages = {
  gerente: [
    { id: "recebido", name: "Recebido", color: "hsl(var(--primary))" },
    { id: "em-analise", name: "Em Análise", color: "hsl(221 83% 53%)" },
    { id: "em-andamento", name: "Em Andamento", color: "hsl(38 92% 50%)" },
    { id: "aguardando", name: "Aguardando", color: "hsl(48 96% 53%)" },
    { id: "resolvido", name: "Resolvido", color: "hsl(142 76% 36%)" }
  ] as Stage[],
  auxiliar: [
    { id: "recebido", name: "Recebido", color: "hsl(var(--primary))" },
    { id: "triagem", name: "Triagem", color: "hsl(221 83% 53%)" },
    { id: "em-execucao", name: "Em Execução", color: "hsl(38 92% 50%)" },
    { id: "aguardando-pagamento", name: "Aguardando Pagamento", color: "hsl(48 96% 53%)" },
    { id: "concluido", name: "Concluído", color: "hsl(142 76% 36%)" }
  ] as Stage[]
};