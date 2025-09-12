import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Ticket {
  id: string;
  title: string;
  description: string | null;
  phone: string;
  email: string | null;
  stage: string;
  category: string;
  priority: "baixa" | "media" | "alta" | "critica";
  property_code: string | null;
  property_address: string | null;
  property_type: "apartamento" | "casa" | "comercial" | "terreno" | null;
  assigned_to: string | null;
  last_contact: string;
  source: string;
  type: "proprietario" | "inquilino";
  value: number | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketStage {
  id: string;
  name: string;
  color: string;
  ticket_type: "proprietario" | "inquilino";
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketData {
  title: string;
  description?: string;
  phone: string;
  email?: string;
  stage: string;
  category: string;
  priority: "baixa" | "media" | "alta" | "critica";
  property_code?: string;
  property_address?: string;
  property_type?: "apartamento" | "casa" | "comercial" | "terreno";
  assigned_to?: string;
  source?: string;
  type: "proprietario" | "inquilino";
  value?: number;
  contact_id?: string;
}

export const useTickets = (type?: "proprietario" | "inquilino") => {
  return useQuery({
    queryKey: ["tickets", type],
    queryFn: async () => {
      let query = supabase.from("tickets").select("*");
      
      if (type) {
        query = query.eq("type", type);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Erro ao carregar tickets");
        throw error;
      }
      
      return data as Ticket[];
    },
  });
};

export const useTicketStages = (type?: "proprietario" | "inquilino") => {
  return useQuery({
    queryKey: ["ticket_stages", type],
    queryFn: async () => {
      let query = supabase.from("ticket_stages").select("*");
      
      if (type) {
        query = query.eq("ticket_type", type);
      }
      
      const { data, error } = await query.order("order_index", { ascending: true });
      
      if (error) {
        toast.error("Erro ao carregar estágios");
        throw error;
      }
      
      return data as TicketStage[];
    },
  });
};

export const useCreateTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ticketData: CreateTicketData) => {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          ...ticketData,
          source: ticketData.source || "whatsapp",
        })
        .select()
        .single();
      
      if (error) {
        console.error("Erro ao criar ticket:", error);
        throw error;
      }
      
      return data as Ticket;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar ticket:", error);
      toast.error("Erro ao criar ticket. Tente novamente.");
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Ticket> }) => {
      const { data, error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) {
        console.error("Erro ao atualizar ticket:", error);
        throw error;
      }
      
      return data as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar ticket:", error);
      toast.error("Erro ao atualizar ticket. Tente novamente.");
    },
  });
};

export const useDeleteTicket = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", id);
      
      if (error) {
        console.error("Erro ao deletar ticket:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar ticket:", error);
      toast.error("Erro ao deletar ticket. Tente novamente.");
    },
  });
};