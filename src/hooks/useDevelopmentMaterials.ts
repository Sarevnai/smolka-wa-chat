import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DevelopmentMaterial {
  id: string;
  development_id: string;
  material_type: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  order_index: number;
  is_featured: boolean;
  whatsapp_media_id: string | null;
  created_at: string;
}

export type MaterialType = 'planta' | 'perspectiva' | 'video' | 'documento' | 'foto';

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  planta: 'Planta Humanizada',
  perspectiva: 'Perspectiva',
  video: 'Vídeo',
  documento: 'Documento',
  foto: 'Foto da Obra'
};

export function useDevelopmentMaterials(developmentId: string | null) {
  return useQuery({
    queryKey: ['development-materials', developmentId],
    queryFn: async () => {
      if (!developmentId) return [];
      const { data, error } = await supabase
        .from('development_materials')
        .select('*')
        .eq('development_id', developmentId)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as DevelopmentMaterial[];
    },
    enabled: !!developmentId
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (material: Omit<DevelopmentMaterial, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('development_materials')
        .insert(material)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['development-materials', variables.development_id] });
    }
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, development_id, ...updates }: Partial<DevelopmentMaterial> & { id: string; development_id: string }) => {
      const { data, error } = await supabase
        .from('development_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['development-materials', variables.development_id] });
    }
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, development_id }: { id: string; development_id: string }) => {
      const { error } = await supabase
        .from('development_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['development-materials', variables.development_id] });
    }
  });
}
