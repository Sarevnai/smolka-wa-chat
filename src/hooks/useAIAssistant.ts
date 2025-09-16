import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AISuggestion {
  id: string;
  suggestion_type: string;
  suggestion_content: any;
  confidence_score: number;
  is_used: boolean;
  created_at: string;
}

export function useAIAssistant(contactPhone?: string, messageId?: number) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Fetch suggestions for a specific message or contact
  const fetchSuggestions = async (phone?: string, msgId?: number) => {
    if (!phone && !msgId) return;

    setIsLoading(true);
    try {
      let query = supabase.from('ai_suggestions').select('*').order('created_at', { ascending: false });
      
      if (msgId) {
        query = query.eq('message_id', msgId);
      } else if (phone) {
        query = query.eq('contact_phone', phone).limit(10);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar sugestões da IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI suggestions for a message
  const generateSuggestions = async (
    messageId: number,
    contactPhone: string,
    messageText: string,
    messageDirection: 'inbound' | 'outbound',
    context?: any
  ) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messageId,
          contactPhone,
          messageText,
          messageDirection,
          context
        }
      });

      if (error) throw error;

      if (data.success) {
        // Refresh suggestions
        await fetchSuggestions(contactPhone, messageId);
        
        toast({
          title: "IA Ativada",
          description: `${data.suggestions.length} sugestões geradas`,
        });

        return data;
      }
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      toast({
        title: "Erro na IA",
        description: "Erro ao gerar sugestões da IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mark suggestion as used
  const useSuggestion = async (suggestionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_suggestions')
        .update({ is_used: true })
        .eq('id', suggestionId);

      if (error) throw error;

      // Update local state
      setSuggestions(prev => 
        prev.map(s => s.id === suggestionId ? { ...s, is_used: true } : s)
      );

      toast({
        title: "Sugestão Aplicada",
        description: "Sugestão da IA foi utilizada",
      });
    } catch (error) {
      console.error('Error marking suggestion as used:', error);
    }
  };

  // Get suggestions by type
  const getSuggestionsByType = (type: string) => {
    return suggestions.filter(s => s.suggestion_type === type);
  };

  // Auto-fetch when contact/message changes
  useEffect(() => {
    fetchSuggestions(contactPhone, messageId);
  }, [contactPhone, messageId]);

  return {
    suggestions,
    isLoading,
    generateSuggestions,
    useSuggestion,
    getSuggestionsByType,
    fetchSuggestions,
    
    // Convenience methods for specific suggestion types
    getResponseSuggestions: () => getSuggestionsByType('response'),
    getClassificationSuggestions: () => getSuggestionsByType('classification'),
    getActionSuggestions: () => getSuggestionsByType('action'),
    getUrgencySuggestions: () => getSuggestionsByType('urgency'),
    getDataExtractionSuggestions: () => getSuggestionsByType('data_extraction'),
  };
}