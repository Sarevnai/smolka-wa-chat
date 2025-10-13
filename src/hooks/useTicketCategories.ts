import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TicketCategory } from '@/types/crm';
import { useToast } from '@/hooks/use-toast';

export function useTicketCategories() {
  return useQuery({
    queryKey: ['ticket-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as TicketCategory[];
    }
  });
}

export function useCreateCategory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryData: Omit<TicketCategory, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .insert(categoryData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast({
        title: "Sucesso",
        description: "Categoria criada com sucesso"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });
}

export function useUpdateCategory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TicketCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('ticket_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast({
        title: "Sucesso",
        description: "Categoria atualizada com sucesso"
      });
    }
  });
}

export function useDeleteCategory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ticket_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      toast({
        title: "Sucesso",
        description: "Categoria removida com sucesso"
      });
    }
  });
}
