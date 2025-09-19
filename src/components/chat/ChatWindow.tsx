import { useState, useEffect, useRef } from "react";
import { User, ArrowLeft, Phone, Building2, Key, FileText, UserPlus, Tags, MoreVertical, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { DateSeparator } from "./DateSeparator";
import { TypingIndicator } from "./TypingIndicator";
import { OnlineStatus } from "./OnlineStatus";
import { MessageSearch } from "./MessageSearch";
import { ReplyPreview } from "./MessageReply";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useToast } from "@/hooks/use-toast";
import { useContactByPhone } from "@/hooks/useContacts";
import { ContactProfile } from "@/components/contacts/ContactProfile";
import { NewContactModal } from "@/components/contacts/NewContactModal";
import { DemandClassification } from "./DemandClassification";
import { CreateTicketModal } from "./CreateTicketModal";
import { supabase } from "@/integrations/supabase/client";
import { MessageRow } from "@/lib/messages";
import { SUPABASE_PROJECT_URL } from "@/lib/supabaseClient";
import { formatPhoneNumber } from "@/lib/utils";
import { isSameDay, parseISO } from "date-fns";

interface ChatWindowProps {
  phoneNumber: string;
  onBack?: () => void;
}

export function ChatWindow({ phoneNumber, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showDemandClassification, setShowDemandClassification] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [replyTo, setReplyTo] = useState<MessageRow | null>(null);
  const { toast } = useToast();
  const { data: contact } = useContactByPhone(phoneNumber);
  const { isTyping: contactIsTyping, startTyping, stopTyping } = useTypingIndicator(phoneNumber);
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
      
      setMessages((data || []) as MessageRow[]);
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
          table: "messages",
          filter: `wa_from=eq.${phoneNumber}`
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          console.log("Nova mensagem INBOUND recebida via realtime:", newMessage);
          
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `wa_to=eq.${phoneNumber}`
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          console.log("Nova mensagem OUTBOUND recebida via realtime:", newMessage);
          
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe((status) => {
        console.log("Status da subscrição realtime:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [phoneNumber]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;

    try {
      setSending(true);
      stopTyping(); // Stop typing indicator when sending

      // Get current session for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      let messageText = text.trim();
      
      // Add reply context if replying to a message
      if (replyTo) {
        const replyText = replyTo.body || '[Mídia]';
        const truncatedReply = replyText.length > 50 ? replyText.substring(0, 50) + '...' : replyText;
        messageText = `_Respondendo a: "${truncatedReply}"_\n\n${messageText}`;
        setReplyTo(null); // Clear reply
      }

      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/send-wa-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: phoneNumber,
          text: messageText,
        }),
      });

      const result = await response.json();

      if (result.success) {
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

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  };

  // Group messages by date for date separators
  const groupMessagesByDate = (messages: MessageRow[]) => {
    const grouped: Array<{ type: 'date' | 'message'; content: any; date?: string }> = [];
    let currentDate = '';

    messages.forEach((message, index) => {
      const messageDate = message.wa_timestamp || message.created_at || '';
      const messageDateOnly = messageDate.split('T')[0]; // Get date part only

      if (messageDateOnly !== currentDate) {
        currentDate = messageDateOnly;
        grouped.push({
          type: 'date',
          content: messageDate,
          date: messageDate
        });
      }

      grouped.push({
        type: 'message',
        content: message,
        date: messageDate
      });
    });

    return grouped;
  };

  const groupedMessages = groupMessagesByDate(messages);

  const displayName = contact?.name || formatPhoneNumber(phoneNumber);
  const displayInitials = getInitials(contact?.name, phoneNumber);

  const handleMessageSelect = (messageId: number) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleReply = (message: MessageRow) => {
    setReplyTo(message);
  };

  const getContactTypeInfo = (type?: string) => {
    switch (type) {
      case 'proprietario':
        return { label: 'Proprietário', icon: Building2, variant: 'default' as const };
      case 'inquilino':
        return { label: 'Inquilino', icon: Key, variant: 'secondary' as const };
      default:
        return null;
    }
  };

  const typeInfo = getContactTypeInfo(contact?.contact_type);
  const TypeIcon = typeInfo?.icon;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 bg-card border-b border-border">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-muted text-foreground font-medium">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-foreground text-base">{displayName}</h3>
            {typeInfo && TypeIcon && (
              <Badge variant={typeInfo.variant} className="flex items-center gap-1 text-xs">
                <TypeIcon className="h-3 w-3" />
                {typeInfo.label}
              </Badge>
            )}
            {contact?.contracts && contact.contracts.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <FileText className="h-3 w-3" />
                {contact.contracts[0].contract_number}
              </Badge>
            )}
          </div>
          {contact?.name ? (
            <OnlineStatus phoneNumber={phoneNumber} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {formatPhoneNumber(phoneNumber)}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSearch(true)}
            className="h-8 w-8 p-0 hover:bg-muted rounded-full"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted rounded-full">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted rounded-full">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <MessageSearch
        messages={messages}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        onMessageSelect={handleMessageSelect}
      />

      {/* Messages */}
      <div 
        className="flex-1 px-4 py-2 overflow-y-auto relative"
        style={{
          background: `hsl(var(--chat-background))`,
          backgroundImage: `var(--chat-pattern)`
        }}
        ref={scrollAreaRef}
      >
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
          <div className="py-2">
            {groupedMessages.map((item, index) => (
              <div key={`${item.type}-${index}`}>
                {item.type === 'date' ? (
                  <DateSeparator date={item.content} />
                ) : (
                  <div data-message-id={item.content.id}>
                    <MessageBubble
                      message={item.content}
                      isLast={index === groupedMessages.length - 1}
                      onReply={handleReply}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {contactIsTyping && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <ReplyPreview
          replyTo={replyTo}
          onClose={() => setReplyTo(null)}
        />
      )}

      {/* Input */}
      <div className="bg-card">
        <MessageComposer 
          onSendMessage={sendMessage} 
          disabled={sending}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
        />
      </div>

      <ContactProfile
        phoneNumber={phoneNumber}
        open={showProfile}
        onOpenChange={setShowProfile}
      />

      <NewContactModal
        open={showNewContact}
        onOpenChange={setShowNewContact}
        initialPhone={phoneNumber}
      />

      <DemandClassification
        open={showDemandClassification}
        onOpenChange={setShowDemandClassification}
        phoneNumber={phoneNumber}
        contact={contact}
        onCreateTicket={() => {
          setShowDemandClassification(false);
          setShowCreateTicket(true);
        }}
      />

      <CreateTicketModal
        open={showCreateTicket}
        onOpenChange={setShowCreateTicket}
        phoneNumber={phoneNumber}
        contact={contact}
        messages={messages}
      />
    </div>
  );
}