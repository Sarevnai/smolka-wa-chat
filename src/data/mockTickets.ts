import { Ticket, Stage } from "@/types/crm";

export const mockTickets: Ticket[] = [];

export const stages: Stage[] = [
  { id: "pendente", name: "Pendente", color: "#94a3b8" },
  { id: "em-progresso", name: "Em Progresso", color: "#3b82f6" },
  { id: "aguardando-resposta", name: "Aguardando Resposta", color: "#f59e0b" },
  { id: "concluido", name: "Concluído", color: "#10b981" }
];
