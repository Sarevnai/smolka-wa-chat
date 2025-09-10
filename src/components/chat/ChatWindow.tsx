import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Phone, MoreVertical, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { MessageRow } from "@/lib/messages";
import { SUPABASE_PROJECT_URL } from "@/lib/supabaseClient";

interface ChatWindowProps {
  phoneNumber: string;
  onBack?: () => void;
}

export function ChatWindow({ phoneNumber, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`wa_from.eq.${phoneNumber},wa_to.eq.${phoneNumber}`)
        .order("wa_timestamp", { ascending: true })
        .limit(500);

      if (error) throw error;
      
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Error loading messages:", error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar as mensagens desta conversa.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Setup realtime subscription for this specific conversation
    const channel = supabase
      .channel(`messages-${phoneNumber}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          
          // Check if this message belongs to the current conversation
          const belongsToConversation = (
            newMessage.wa_from === phoneNumber || 
            newMessage.wa_to === phoneNumber ||
            (newMessage.direction === "outbound" && newMessage.wa_to === phoneNumber)
          );
          
          if (belongsToConversation) {
            setMessages(prev => [...prev, newMessage]);
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phoneNumber]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    try {
      setSending(true);

      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/send-wa-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phoneNumber,
          text: text.trim(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Mensagem enviada",
          description: "Sua mensagem foi enviada com sucesso!",
        });
        
        // Message will be added via realtime subscription from database
        // No need for optimistic UI update anymore
      } else {
        throw new Error(result.error || "Erro ao enviar mensagem");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const getInitials = (phoneNumber: string) => {
    return phoneNumber.slice(-2).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {getInitials(phoneNumber)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="font-medium text-foreground">{phoneNumber}</h3>
          <p className="text-sm text-muted-foreground">WhatsApp</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-center text-muted-foreground">
              Inicie uma conversa enviando uma mensagem
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.id}-${index}`}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border bg-card">
        <ChatInput onSendMessage={sendMessage} disabled={sending} />
      </div>
    </div>
  );
}