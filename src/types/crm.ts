export interface Property {
  code: string;
  address: string;
  type: "apartamento" | "casa" | "comercial" | "terreno";
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  phone: string;
  email?: string;
  stage: string;
  category: string;
  priority: "baixa" | "media" | "alta" | "critica";
  property: Property;
  assignedTo?: string;
  lastContact: string;
  source: string;
  type: "gerente" | "auxiliar";
  createdAt: string;
  value?: number; // Para casos que envolvem valores
}

export interface Stage {
  id: string;
  name: string;
  color: string;
}

export const CATEGORIES = {
  gerente: [
    { id: "manutencao-preventiva", name: "🔧 Manutenção Preventiva", color: "bg-blue-100 text-blue-700" },
    { id: "gestao-contratual", name: "📋 Gestão Contratual", color: "bg-purple-100 text-purple-700" },
    { id: "questoes-financeiras", name: "💰 Questões Financeiras", color: "bg-green-100 text-green-700" },
    { id: "melhorias-imovel", name: "🏠 Melhorias no Imóvel", color: "bg-orange-100 text-orange-700" },
    { id: "solicitacoes-auxiliar", name: "📞 Solicitações do Auxiliar", color: "bg-yellow-100 text-yellow-700" }
  ],
  auxiliar: [
    { id: "manutencao-corretiva", name: "🔨 Manutenção Corretiva", color: "bg-red-100 text-red-700" },
    { id: "pagamentos-boletos", name: "💳 Pagamentos/Boletos", color: "bg-green-100 text-green-700" },
    { id: "seguro-garantias", name: "🛡️ Seguro e Garantias", color: "bg-blue-100 text-blue-700" },
    { id: "documentos", name: "📄 Documentos", color: "bg-gray-100 text-gray-700" },
    { id: "duvidas-gerais", name: "❓ Dúvidas Gerais", color: "bg-indigo-100 text-indigo-700" }
  ]
};

export const PRIORITY_CONFIG = {
  baixa: { color: "bg-gray-100 text-gray-600", label: "Baixa" },
  media: { color: "bg-yellow-100 text-yellow-700", label: "Média" },
  alta: { color: "bg-orange-100 text-orange-700", label: "Alta" },
  critica: { color: "bg-red-100 text-red-700", label: "Crítica" }
};