import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FlagType = 'important' | 'unread' | 'starred' | 'priority';

export interface MessageFlag {
  id: string;
  message_id: number;
  user_id: string;
  flag_type: FlagType;
  created_at: string;
  updated_at: string;
}

export function useMessageFlags(phoneNumber?: string) {
  const [flags, setFlags] = useState<MessageFlag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchFlags = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('message_flags')
        .select('*')
        .order('created_at', { ascending: false });

      if (phoneNumber) {
        // Get messages for this phone number first, then get flags for those messages
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`);
        
        if (messages && messages.length > 0) {
          const messageIds = messages.map(m => m.id);
          query = query.in('message_id', messageIds);
        }
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setFlags((data || []) as MessageFlag[]);
    } catch (error) {
      console.error('Error fetching flags:', error);
      toast({
        title: "Erro ao carregar marcações",
        description: "Não foi possível carregar as marcações das mensagens.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlag = async (messageId: number, flagType: FlagType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check if flag already exists
      const existingFlag = flags.find(
        f => f.message_id === messageId && f.flag_type === flagType
      );

      if (existingFlag) {
        // Remove flag
        const { error } = await supabase
          .from('message_flags')
          .delete()
          .eq('id', existingFlag.id);

        if (error) throw error;
        setFlags(prev => prev.filter(f => f.id !== existingFlag.id));
        
        toast({
          title: "Marcação removida",
          description: `Mensagem desmarcada como ${flagType}.`,
        });
      } else {
        // Add flag
        const { data, error } = await supabase
          .from('message_flags')
          .insert({
            message_id: messageId,
            user_id: user.id,
            flag_type: flagType
          })
          .select()
          .single();

        if (error) throw error;
        setFlags(prev => [...prev, data as MessageFlag]);
        
        toast({
          title: "Mensagem marcada",
          description: `Mensagem marcada como ${flagType}.`,
        });
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
      toast({
        title: "Erro ao marcar mensagem",
        description: "Não foi possível alterar a marcação da mensagem.",
        variant: "destructive",
      });
    }
  };

  const getMessageFlags = (messageId: number): FlagType[] => {
    return flags
      .filter(f => f.message_id === messageId)
      .map(f => f.flag_type);
  };

  const hasFlag = (messageId: number, flagType: FlagType): boolean => {
    return flags.some(f => f.message_id === messageId && f.flag_type === flagType);
  };

  const getFlagsByType = (flagType: FlagType): MessageFlag[] => {
    return flags.filter(f => f.flag_type === flagType);
  };

  const getFlagCounts = () => {
    return flags.reduce((acc, flag) => {
      acc[flag.flag_type] = (acc[flag.flag_type] || 0) + 1;
      return acc;
    }, {} as Record<FlagType, number>);
  };

  useEffect(() => {
    fetchFlags();
  }, [phoneNumber]);

  return {
    flags,
    isLoading,
    toggleFlag,
    getMessageFlags,
    hasFlag,
    getFlagsByType,
    getFlagCounts,
    refetch: fetchFlags
  };
}