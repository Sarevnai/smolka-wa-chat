import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";

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
  contact_type: "proprietario" | "inquilino" | null;
  value: number | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketStage {
  id: string;
  name: string;
  color: string;
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
  value?: number;
  contact_id?: string;
}

export const useTickets = (filters?: {
  assignedTo?: string;
  category?: string;
  unassignedOnly?: boolean;
}) => {
  return useQuery({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      let query = supabase.from("tickets").select("*");
      
      if (filters?.assignedTo) {
        query = query.eq("assigned_to", filters.assignedTo);
      }
      
      if (filters?.unassignedOnly) {
        query = query.is("assigned_to", null);
      }
      
      if (filters?.category) {
        query = query.eq("category", filters.category);
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

export const useTicketStages = () => {
  return useQuery({
    queryKey: ["ticket_stages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_stages")
        .select("*")
        .order("order_index", { ascending: true });
      
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket criado com sucesso!");
      
      // 🚀 Automatic ClickUp synchronization
      try {
        console.log('🔄 Starting automatic ClickUp sync for ticket:', data.id);
        
        const { data: config } = await supabase
          .from('clickup_config')
          .select('default_list_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (config?.default_list_id) {
          const { data: syncResult, error: syncError } = await supabase.functions.invoke('clickup-create-task', {
            body: { ticket: data, listId: config.default_list_id }
          });
          
          if (syncError) {
            console.error('❌ ClickUp sync failed:', syncError);
            toast.error("Ticket criado, mas falha na sincronização com ClickUp");
          } else {
            console.log('✅ ClickUp sync successful:', syncResult);
            toast.success("Ticket sincronizado com ClickUp!");
          }
        } else {
          console.warn('⚠️ ClickUp not configured - skipping sync');
        }
      } catch (clickupError) {
        console.error('❌ ClickUp sync error:', clickupError);
        // Don't block ticket creation if ClickUp sync fails
      }
    },
    onError: (error) => {
      console.error("Erro ao criar ticket:", error);
      toast.error("Erro ao criar ticket. Tente novamente.");
    },
  });
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();
  const { toast: toastHook } = useToast();
  
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

      // If stage was updated, sync with ClickUp
      if (updates.stage) {
        try {
          await supabase.functions.invoke('clickup-update-task-status', {
            body: {
              ticketId: id,
              updates: {
                status: updates.stage
              }
            }
          });
        } catch (clickupError) {
          console.error('ClickUp sync error:', clickupError);
          // Don't throw here - ticket update succeeded even if ClickUp sync failed
        }
      }
      
      return data as Ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toastHook({
        title: "Ticket atualizado",
        description: "O ticket foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error("Erro ao atualizar ticket:", error);
      toastHook({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o ticket.",
        variant: "destructive",
      });
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