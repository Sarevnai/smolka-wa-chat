import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnitType {
  tipo: string;
  area: number;
  preco_de: number;
}

export interface FAQ {
  pergunta: string;
  resposta: string;
}

export interface Development {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  developer: string;
  address: string | null;
  neighborhood: string | null;
  city: string;
  status: string;
  delivery_date: string | null;
  starting_price: number | null;
  description: string | null;
  differentials: string[];
  amenities: string[];
  unit_types: UnitType[];
  faq: FAQ[];
  ai_instructions: string | null;
  talking_points: string[];
  is_active: boolean;
  c2s_project_id: string | null;
}

export function useDevelopments() {
  return useQuery({
    queryKey: ['developments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('developments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        unit_types: (d.unit_types || []) as unknown as UnitType[],
        faq: (d.faq || []) as unknown as FAQ[]
      })) as Development[];
    }
  });
}

export function useDevelopment(id: string | null) {
  return useQuery({
    queryKey: ['development', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('developments')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        unit_types: (data.unit_types || []) as unknown as UnitType[],
        faq: (data.faq || []) as unknown as FAQ[]
      } as Development;
    },
    enabled: !!id
  });
}

export function useCreateDevelopment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (development: Partial<Development>) => {
      const { data, error } = await supabase
        .from('developments')
        .insert(development as any)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developments'] });
    }
  });
}

export function useUpdateDevelopment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Development> & { id: string }) => {
      const { data, error } = await supabase
        .from('developments')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developments'] });
    }
  });
}

export function useDeleteDevelopment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('developments')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developments'] });
    }
  });
}
