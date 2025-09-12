import { useState, useEffect } from "react";
import { Search, MessageSquare, ArrowLeft } from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConversationItem } from "./ConversationItem";
import { supabase } from "@/integrations/supabase/client";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface Conversation {
  phoneNumber: string;
  lastMessage: MessageRow;
  messageCount: number;
  unreadCount: number;
  contactName?: string;
}

interface ChatListProps {
  onContactSelect: (phoneNumber: string) => void;
  selectedContact?: string;
  onBack?: () => void;
}

export function ChatList({ onContactSelect, selectedContact, onBack }: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Get all messages and group by phone number
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .order("wa_timestamp", { ascending: false })
        .limit(1000);

      if (error) throw error;

      // Group messages by phone number (using wa_from for inbound, wa_to for outbound)
      const conversationMap = new Map<string, MessageRow[]>();
      
      messages?.forEach((message) => {
        const phoneNumber = message.direction === "inbound" ? message.wa_from : message.wa_to;
        if (phoneNumber) {
          if (!conversationMap.has(phoneNumber)) {
            conversationMap.set(phoneNumber, []);
          }
          conversationMap.get(phoneNumber)!.push(message as MessageRow);
        }
      });

      // Convert to conversation objects
      const conversationList: Conversation[] = Array.from(conversationMap.entries()).map(([phoneNumber, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(b.wa_timestamp || b.created_at || "").getTime() - 
          new Date(a.wa_timestamp || a.created_at || "").getTime()
        );
        
        return {
          phoneNumber,
          lastMessage: sortedMessages[0],
          messageCount: messages.length,
          unreadCount: 0 // TODO: Implement unread count logic
        };
      });

      // Sort conversations by last message timestamp
      conversationList.sort((a, b) => 
        new Date(b.lastMessage.wa_timestamp || b.lastMessage.created_at || "").getTime() - 
        new Date(a.lastMessage.wa_timestamp || a.lastMessage.created_at || "").getTime()
      );

      setConversations(conversationList);
    } catch (error) {
      console.error("Error loading conversations:", error);
      toast({
        title: "Erro ao carregar conversas",
        description: "Não foi possível carregar as conversas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();

    // Setup realtime subscription
    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          // Reload conversations when new message arrives
          loadConversations();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        () => {
          // Reload conversations when messages are deleted
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredConversations = conversations.filter(conversation =>
    conversation.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conversation.contactName && conversation.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatLastMessageTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (isToday(date)) {
        return format(date, "HH:mm", { locale: ptBR });
      } else if (isYesterday(date)) {
        return "Ontem";
      } else {
        return format(date, "dd/MM", { locale: ptBR });
      }
    } catch {
      return "";
    }
  };

  const getInitials = (phoneNumber: string) => {
    return phoneNumber.slice(-2).toUpperCase();
  };

  const truncateMessage = (text: string, maxLength: number = 50) => {
    if (!text) return "Sem conteúdo";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-xl font-semibold text-foreground">Conversas</h2>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              {searchQuery ? "Nenhuma conversa encontrada" : "Sem conversas ainda"}
            </p>
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.phoneNumber}
                phoneNumber={conversation.phoneNumber}
                lastMessage={conversation.lastMessage}
                messageCount={conversation.messageCount}
                unreadCount={conversation.unreadCount}
                isSelected={selectedContact === conversation.phoneNumber}
                onClick={() => onContactSelect(conversation.phoneNumber)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}