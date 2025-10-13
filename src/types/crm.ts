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
  contact_type?: "proprietario" | "inquilino";
  createdAt: string;
  value?: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  name: string;
  color: string;
}

export const PRIORITY_CONFIG = {
  baixa: { color: "bg-gray-100 text-gray-600", label: "Baixa" },
  media: { color: "bg-yellow-100 text-yellow-700", label: "Média" },
  alta: { color: "bg-orange-100 text-orange-700", label: "Alta" },
  critica: { color: "bg-red-100 text-red-700", label: "Crítica" }
};