import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: any[];
}

interface AIConversation {
  id: string;
  conversation_type: string;
  messages: AIMessage[];
  context_data: any;
  is_active: boolean;
  created_at: string;
}

export function useAICommunicator() {
  const [conversation, setConversation] = useState<AIConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Start new conversation
  const startConversation = async () => {
    if (!user) {
      console.log('No user available for starting conversation');
      return;
    }

    setIsLoading(true);
    console.log('Starting AI conversation for user:', user.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-communicator', {
        body: {
          action: 'start_conversation',
          userId: user.id
        }
      });

      console.log('Start conversation response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success && data?.conversation) {
        console.log('Setting conversation:', data.conversation);
        setConversation(data.conversation);
        setIsConnected(true);
        
        toast({
          title: "IA Conectada",
          description: "Assistente de IA está pronto para ajudar",
        });
      } else {
        throw new Error('Invalid response from AI communicator');
      }
    } catch (error) {
      console.error('Error starting AI conversation:', error);
      setIsConnected(false);
      setConversation(null);
      toast({
        title: "Erro de Conexão",
        description: `Erro ao conectar com a IA: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to AI
  const sendMessage = async (message: string, context?: any) => {
    if (!user) {
      console.log('No user available for sending message');
      return;
    }
    
    if (!conversation) {
      console.log('No active conversation, starting new one...');
      await startConversation();
      return;
    }

    if (!message.trim()) {
      console.log('Empty message, skipping send');
      return;
    }

    setIsLoading(true);
    console.log('Sending message to AI:', { message, conversationId: conversation.id });
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-communicator', {
        body: {
          action: 'send_message',
          userId: user.id,
          message: message.trim(),
          conversationId: conversation.id,
          context
        }
      });

      console.log('Send message response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.success && data?.message) {
        // Update local conversation with new messages
        setConversation(prev => {
          if (!prev) {
            console.error('No conversation to update');
            return null;
          }
          
          const userMessage: AIMessage = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
          };

          const assistantMessage: AIMessage = {
            role: 'assistant',
            content: data.message,
            timestamp: new Date().toISOString(),
            actions: data.actions || []
          };

          const newMessages = [...prev.messages, userMessage, assistantMessage];
          console.log('Updated conversation with messages:', newMessages.length);

          return { ...prev, messages: newMessages };
        });

        // Show success if actions were executed
        if (data.actions && data.actions.length > 0) {
          toast({
            title: "Ação Executada",
            description: `${data.actions.length} ação(ões) executada(s) pela IA`,
          });
        }

        return data;
      } else {
        throw new Error('Invalid response from AI communicator');
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
      toast({
        title: "Erro de Comunicação",
        description: `Erro ao enviar mensagem para a IA: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get business insights
  const getInsights = async (context?: any) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-communicator', {
        body: {
          action: 'get_insights',
          userId: user.id,
          context
        }
      });

      if (error) throw error;

      if (data.success) {
        return data.insights;
      }
    } catch (error) {
      console.error('Error getting AI insights:', error);
      toast({
        title: "Erro nos Insights",
        description: "Erro ao obter insights da IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute command via natural language
  const executeCommand = async (command: string, context?: any) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-communicator', {
        body: {
          action: 'execute_command',
          userId: user.id,
          message: command,
          context
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Comando Executado",
          description: "Comando processado pela IA",
        });

        return data;
      }
    } catch (error) {
      console.error('Error executing AI command:', error);
      toast({
        title: "Erro no Comando",
        description: "Erro ao executar comando da IA",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect from AI
  const disconnect = () => {
    setConversation(null);
    setIsConnected(false);
    
    toast({
      title: "IA Desconectada",
      description: "Assistente de IA foi desconectado",
    });
  };

  // Load existing active conversation on mount
  useEffect(() => {
    if (!user) {
      console.log('No user, skipping conversation load');
      return;
    }

    const loadActiveConversation = async () => {
      console.log('Loading active conversation for user:', user.id);
      
      try {
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('conversation_type', 'assistant')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('Load conversation result:', { data, error });

        if (error) {
          console.error('Error loading conversation:', error);
          throw error;
        }

        if (data) {
          const conversationData = {
            ...data,
            messages: Array.isArray(data.messages) ? (data.messages as unknown as AIMessage[]) : []
          };
          
          console.log('Setting loaded conversation:', conversationData);
          setConversation(conversationData);
          setIsConnected(true);
        } else {
          console.log('No active conversation found');
          setConversation(null);
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Error loading active conversation:', error);
        setConversation(null);
        setIsConnected(false);
      }
    };

    loadActiveConversation();
  }, [user]);

  return {
    conversation,
    isLoading,
    isConnected,
    startConversation,
    sendMessage,
    getInsights,
    executeCommand,
    disconnect,
    
    // Convenience methods
    getMessages: () => conversation?.messages || [],
    getLastMessage: () => {
      const messages = conversation?.messages || [];
      return messages[messages.length - 1];
    },
    getMessageCount: () => conversation?.messages.length || 0,
  };
}