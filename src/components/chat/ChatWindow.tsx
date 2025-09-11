import { useState, useEffect, useRef } from "react";
import { User, ArrowLeft, Phone, Building2, Key, FileText, UserPlus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
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

interface ChatWindowProps {
  phoneNumber: string;
  onBack?: () => void;
}

export function ChatWindow({ phoneNumber, onBack }: ChatWindowProps) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showDemandClassification, setShowDemandClassification] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const { toast } = useToast();
  const { data: contact } = useContactByPhone(phoneNumber);
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

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (phone) {
      return phone.slice(-2);
    }
    return '??';
  };

  const displayName = contact?.name || formatPhoneNumber(phoneNumber);
  const displayInitials = getInitials(contact?.name, phoneNumber);

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
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground">{displayName}</h3>
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
          <p className="text-sm text-muted-foreground">
            {contact?.name ? formatPhoneNumber(phoneNumber) : 'WhatsApp'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowDemandClassification(true)}
            title="Classificar demanda"
          >
            <Tags className="h-4 w-4" />
          </Button>
          {!contact && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowNewContact(true)}
              title="Adicionar contato"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowProfile(true)}
          >
            <User className="h-4 w-4" />
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