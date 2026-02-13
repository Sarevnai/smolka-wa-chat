import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Directive {
  id: string;
  department: string;
  context: string;
  directive_content: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export function useDirectives() {
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadDirectives = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_directives' as any)
        .select('*')
        .eq('is_active', true)
        .order('department')
        .order('context');

      if (error) throw error;
      setDirectives((data as any[]) || []);
    } catch (error) {
      console.error('Error loading directives:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDirectives();
  }, [loadDirectives]);

  const updateDirective = async (id: string, content: string) => {
    setIsSaving(true);
    try {
      // Get current directive to increment version
      const current = directives.find(d => d.id === id);
      if (!current) throw new Error('Directive not found');

      // Deactivate old version
      await (supabase.from('ai_directives' as any) as any)
        .update({ is_active: false })
        .eq('id', id);

      // Insert new version
      const { error } = await (supabase.from('ai_directives' as any) as any)
        .insert({
          department: current.department,
          context: current.context,
          directive_content: content,
          version: current.version + 1,
          is_active: true,
        });

      if (error) throw error;
      toast.success('Directive salva com sucesso!');
      await loadDirectives();
    } catch (error) {
      console.error('Error updating directive:', error);
      toast.error('Erro ao salvar directive');
    } finally {
      setIsSaving(false);
    }
  };

  const getVersionHistory = async (department: string, context: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_directives' as any)
        .select('*')
        .eq('department', department)
        .eq('context', context)
        .order('version', { ascending: false });

      if (error) throw error;
      return (data as any[]) || [];
    } catch (error) {
      console.error('Error loading version history:', error);
      return [];
    }
  };

  return {
    directives,
    isLoading,
    isSaving,
    updateDirective,
    getVersionHistory,
    reload: loadDirectives,
  };
}
