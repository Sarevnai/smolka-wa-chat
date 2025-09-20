import { useState, useEffect, useRef } from "react";
import { User, ArrowLeft, Phone, Building2, Key, FileText, UserPlus, Tags, MoreVertical, Search, Image, Clock } from "lucide-react";
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
import { MediaGallery } from "./MediaGallery";
import { MessageForward } from "./MessageForward";
import { ChatBackground } from "./ChatBackground";
import { MessageScheduler } from "./MessageScheduler";
import { ChatSettings } from "./ChatSettings";
import { VoiceRecorder } from "./VoiceRecorder";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMediaGallery } from "@/hooks/useMediaGallery";
import { useChatSettings } from "@/hooks/useChatSettings";
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
import { cn } from "@/lib/utils";

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
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<MessageRow | null>(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  const { toast } = useToast();
  const { data: contact } = useContactByPhone(phoneNumber);
  const { isTyping: contactIsTyping, startTyping, stopTyping } = useTypingIndicator(phoneNumber);
  const { isGalleryOpen, selectedMediaIndex, openGallery, closeGallery, getMediaMessages } = useMediaGallery();
  const { settings, updateBackground, exportChat, archiveChat, deleteChat } = useChatSettings(phoneNumber);
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

  const handleReply = (message: MessageRow) => {
    setReplyTo(message);
  };

  const clearReply = () => {
    setReplyTo(null);
  };

  const handleForward = (message: MessageRow) => {
    setForwardMessage(message);
    setShowForwardModal(true);
  };

  const handleForwardSend = async (selectedContacts: string[], message: MessageRow) => {
    // TODO: Implement forward message logic
    toast({
      title: "Mensagem encaminhada",
      description: `Enviada para ${selectedContacts.length} contato(s)`,
    });
  };

  const handleScheduleMessage = async (message: string, scheduledTime: Date) => {
    // TODO: Implement scheduled message logic
    toast({
      title: "Mensagem agendada",
      description: `Será enviada em ${scheduledTime.toLocaleString()}`,
    });
  };

  const handleVoiceSend = async (audioBlob: Blob) => {
    // TODO: Implement voice message sending
    setShowVoiceRecorder(false);
    toast({
      title: "Áudio enviado",
      description: "Mensagem de áudio enviada com sucesso",
    });
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
    <div className="h-full flex flex-col">
      {/* WhatsApp Chat Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-chat-header border-b border-sidebar-border shadow-sm h-[59px]">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gray-400 text-white font-medium">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-medium text-gray-900 text-base">{displayName}</h3>
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
            <p className="text-sm text-gray-600">
              {formatPhoneNumber(phoneNumber)}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSearch(!showSearch)}
            className={cn(
              "h-10 w-10 p-0 hover:bg-gray-100 rounded-full transition-colors text-gray-600",
              showSearch && "bg-gray-100"
            )}
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => openGallery()}
            className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <Image className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowScheduler(true)}
            className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <Clock className="h-5 w-5" />
          </Button>
          
          <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full text-gray-600">
            <Phone className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowSettings(true)}
            className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full text-gray-600"
          >
            <MoreVertical className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search - positioned right after header */}
      {showSearch && (
        <MessageSearch
          messages={messages}
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onMessageSelect={handleMessageSelect}
        />
      )}

      {/* Messages */}
      <div 
        className="flex-1 px-4 py-2 overflow-y-auto relative bg-chat-background"
        style={{ backgroundImage: 'var(--chat-pattern)' }}
        ref={scrollAreaRef}
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <Phone className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Inicie uma conversa
            </h3>
            <p className="text-center text-muted-foreground max-w-xs">
              Envie uma mensagem para começar uma nova conversa com este contato
            </p>
          </div>
        ) : (
          <div className="py-1 px-1">
            {groupedMessages.map((item, index) => (
              <div key={`${item.type}-${index}`} className="animate-fade-in">
                {item.type === 'date' ? (
                  <DateSeparator date={item.content} />
                ) : (
                  <div data-message-id={item.content.id}>
                    <MessageBubble
                      message={item.content}
                      isLast={index === groupedMessages.length - 1}
                      onReply={handleReply}
                      onForward={handleForward}
                    />
                  </div>
                )}
              </div>
            ))}
            
            {/* Typing indicator */}
            {contactIsTyping && (
              <div className="animate-fade-in">
                <TypingIndicator />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <ReplyPreview
          replyTo={replyTo}
          onClose={clearReply}
        />
      )}

      {/* Voice Recorder or Input */}
      <div className="bg-chat-header px-4 py-2">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSendAudio={handleVoiceSend}
            onCancel={() => setShowVoiceRecorder(false)}
            className="mx-4 mb-4"
          />
        ) : (
          <MessageComposer 
            onSendMessage={sendMessage} 
            disabled={sending}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            replyTo={replyTo}
            onVoiceRecord={() => setShowVoiceRecorder(true)}
          />
        )}
      </div>

      {/* Modals */}
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

      <MediaGallery
        isOpen={isGalleryOpen}
        onClose={closeGallery}
        messages={messages}
        initialMediaIndex={selectedMediaIndex}
      />

      <MessageForward
        isOpen={showForwardModal}
        onClose={() => setShowForwardModal(false)}
        message={forwardMessage!}
        onForward={handleForwardSend}
      />

      <MessageScheduler
        isOpen={showScheduler}
        onClose={() => setShowScheduler(false)}
        phoneNumber={phoneNumber}
        onSchedule={handleScheduleMessage}
      />

      <ChatSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        phoneNumber={phoneNumber}
        onExportChat={() => exportChat(messages)}
        onArchiveChat={archiveChat}
        onDeleteChat={deleteChat}
      />
    </div>
  );
}