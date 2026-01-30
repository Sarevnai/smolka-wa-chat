import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { User, ArrowLeft, Phone, Building2, Key, FileText, MoreVertical, Search, Image, Clock, MessageCircle, Bot, ClipboardList, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { MessageScheduler } from "./MessageScheduler";
import { ChatSettings } from "./ChatSettings";
import { VoiceRecorder } from "./VoiceRecorder";
import { QuickActionsMenu } from "./QuickActionsMenu";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { useDeleteConversation } from "@/hooks/useDeleteConversation";
import { useDeleteMessage } from "@/hooks/useDeleteMessage";
import { DeleteMessageConfirmation } from "./DeleteMessageConfirmation";
import { DeletedMessagesTrash } from "./DeletedMessagesTrash";
import { QuickTemplateSender } from "./QuickTemplateSender";
import { AIHandoverBanner } from "./AIHandoverBanner";
import { SendToC2SModal } from "./SendToC2SModal";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useConversationState } from "@/hooks/useConversationState";
import { useMediaGallery } from "@/hooks/useMediaGallery";
import { useChatSettings } from "@/hooks/useChatSettings";
import { useSendMessage } from "@/hooks/useSendMessage";
import { useToast } from "@/hooks/use-toast";
import { useContactByPhone } from "@/hooks/useContacts";
import { useRealtimeMessages } from "@/contexts/RealtimeMessagesContext";
import { useDepartment } from "@/contexts/DepartmentContext";
import { ContactProfile } from "@/components/contacts/ContactProfile";
import { NewContactModal } from "@/components/contacts/NewContactModal";
import { DemandClassification } from "./DemandClassification";
import { CreateTicketModal } from "./CreateTicketModal";
import { supabase } from "@/integrations/supabase/client";
import { MessageRow } from "@/lib/messages";
import { MessageFlagsFilter } from "./MessageFlagsFilter";
import { type FlagType } from "@/hooks/useMessageFlags";
import { formatPhoneNumber, cn } from "@/lib/utils";

interface ChatWindowProps {
  conversationId: string;
  onBack?: () => void;
}

interface ConversationData {
  id: string;
  phone_number: string;
  department_code?: string | null;
  contact_id?: string | null;
}

export function ChatWindow({ conversationId, onBack }: ChatWindowProps) {
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showQuickTemplate, setShowQuickTemplate] = useState(false);
  const [showC2SModal, setShowC2SModal] = useState(false);
  const [selectedFlags, setSelectedFlags] = useState<FlagType[]>([]);
  
  // Conversation data fetched from conversationId
  const [conversationData, setConversationData] = useState<ConversationData | null>(null);
  const phoneNumber = conversationData?.phone_number || '';
  
  const { toast } = useToast();
  const { data: contact } = useContactByPhone(phoneNumber);
  const { isTyping: contactIsTyping, startTyping, stopTyping } = useTypingIndicator(phoneNumber);
  const { isGalleryOpen, selectedMediaIndex, openGallery, closeGallery, getMediaMessages } = useMediaGallery();
  const { settings, updateBackground, exportChat, archiveChat, deleteChat } = useChatSettings(phoneNumber);
  const { deleteConversation, isDeleting } = useDeleteConversation();
  const { deleteMessage, isDeleting: isDeletingMessage } = useDeleteMessage();
  const { 
    isAIActive, 
    isLoading: aiLoading, 
    takeoverConversation, 
    releaseToAI, 
    markHumanMessage 
  } = useConversationState(conversationId, phoneNumber);
  const { viewMode, activeDepartment } = useDepartment();
  
  // Message deletion states
  const [messageToDelete, setMessageToDelete] = useState<MessageRow | null>(null);
  const [deletionType, setDeletionType] = useState<'for_me' | 'for_everyone'>('for_me');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Fetch conversation data first
  useEffect(() => {
    const fetchConversation = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('id, phone_number, department_code, contact_id')
          .eq('id', conversationId)
          .single();
        
        if (error) throw error;
        setConversationData(data);
      } catch (error) {
        console.error('Error fetching conversation:', error);
        toast({
          title: "Erro ao carregar conversa",
          description: "Não foi possível carregar os dados da conversa.",
          variant: "destructive",
        });
      }
    };
    
    fetchConversation();
  }, [conversationId, toast]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      setLoading(true);
      
      // Fetch messages by conversation_id (ISOLATED by department!)
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq('conversation_id', conversationId)
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
  }, [conversationId, scrollToBottom, toast]);

  useEffect(() => {
    if (conversationData) {
      loadMessages();
    }
  }, [loadMessages, conversationData]);

  // Use centralized realtime context - subscribe by conversationId
  const { subscribeToConversation } = useRealtimeMessages();

  useEffect(() => {
    if (!conversationId) return;
    
    console.log('🔍 [ChatWindow] Inscrevendo-se para mensagens da conversa:', conversationId);

    const unsubscribe = subscribeToConversation(conversationId, (newMessage) => {
      console.log('📨 [ChatWindow] Mensagem recebida:', newMessage.id);
      
      setMessages(prev => {
        // Check if message already exists (for UPDATE events)
        const existingIndex = prev.findIndex(msg => msg.id === newMessage.id);
        
        if (existingIndex !== -1) {
          // Message exists - this is an UPDATE (e.g., status change)
          console.log('🔄 [ChatWindow] Atualizando mensagem existente:', newMessage.id);
          const updated = [...prev];
          updated[existingIndex] = newMessage;
          return updated;
        }
        
        // New message - add and sort by timestamp
        const updated = [...prev, newMessage].sort((a, b) => 
          new Date(a.wa_timestamp || a.created_at || "").getTime() - 
          new Date(b.wa_timestamp || b.created_at || "").getTime()
        );
        
        console.log('📝 [ChatWindow] Total de mensagens:', updated.length);
        return updated;
      });
      
      // Scroll to bottom only for new messages (not updates)
      requestAnimationFrame(() => {
        setTimeout(scrollToBottom, 100);
      });
    });

    return () => {
      console.log('🔌 [ChatWindow] Desinscrevendo de conversa:', conversationId);
      unsubscribe();
    };
  }, [conversationId, subscribeToConversation, scrollToBottom]);

  // Use the new centralized send message hook with department routing
  const { sendTextMessage, sendMediaMessage: sendMediaViaHook, isSending: hookSending } = useSendMessage();

  const sendMessage = useCallback(async (text: string, attendantName?: string) => {
    if (!text.trim() || sending) return;

    try {
      setSending(true);
      stopTyping(); // Stop typing indicator when sending
      
      // Auto-takeover: mark that human is handling this conversation
      await markHumanMessage();

      let messageText = text.trim();
      
      // Add reply context if replying to a message
      if (replyTo) {
        const replyText = replyTo.body || '[Mídia]';
        const truncatedReply = replyText.length > 50 ? replyText.substring(0, 50) + '...' : replyText;
        messageText = `_Respondendo a: "${truncatedReply}"_\n\n${messageText}`;
        setReplyTo(null); // Clear reply
      }

      // Use the new hook with department-based routing
      const result = await sendTextMessage({
        to: phoneNumber,
        text: messageText,
        conversationId: conversationId,
        attendantName: attendantName,
        departmentCode: conversationData?.department_code,
      });

      if (!result.success) {
        throw new Error(result.error || "Erro ao enviar mensagem");
      }
      
      // Message will be added via realtime subscription from database
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
  }, [sending, replyTo, phoneNumber, conversationId, conversationData?.department_code, stopTyping, toast, markHumanMessage, sendTextMessage]);

  const handleReply = useCallback((message: MessageRow) => {
    setReplyTo(message);
  }, []);

  const clearReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleForward = useCallback((message: MessageRow) => {
    setForwardMessage(message);
    setShowForwardModal(true);
  }, []);

  const handleForwardSend = useCallback(async (
    selectedContacts: string[], 
    message: MessageRow,
    additionalText?: string
  ) => {
    const { formatForwardedMessage, isMediaMessage, getWhatsAppMediaType } = await import("@/lib/forward-utils");
    
    let successCount = 0;
    let failCount = 0;

    toast({
      title: "Encaminhando mensagens...",
      description: `Enviando para ${selectedContacts.length} contato(s)`,
    });

    for (const contactPhone of selectedContacts) {
      try {
        // Se for mensagem de mídia
        if (isMediaMessage(message)) {
          const formattedCaption = formatForwardedMessage(message, additionalText);
          
          const { error } = await supabase.functions.invoke('send-wa-media', {
            body: {
              to: contactPhone,
              mediaUrl: message.media_url,
              mediaType: getWhatsAppMediaType(message.media_mime_type || message.media_type || ''),
              caption: formattedCaption,
              filename: message.media_filename || undefined,
            }
          });

          if (error) throw error;
          successCount++;
        } 
        // Se for mensagem de texto
        else if (message.body) {
          const formattedText = formatForwardedMessage(message, additionalText);
          
          const { error } = await supabase.functions.invoke('send-wa-message', {
            body: {
              to: contactPhone,
              text: formattedText,
            }
          });

          if (error) throw error;
          successCount++;
        }
      } catch (error) {
        console.error(`Erro ao encaminhar para ${contactPhone}:`, error);
        failCount++;
      }
    }

    // Feedback final
    if (failCount === 0) {
      toast({
        title: "✅ Mensagens encaminhadas!",
        description: `Enviadas com sucesso para ${successCount} contato(s)`,
      });
    } else {
      toast({
        title: "⚠️ Encaminhamento parcial",
        description: `${successCount} enviadas, ${failCount} falharam`,
        variant: "destructive",
      });
    }

    setShowForwardModal(false);
  }, [toast]);

  const handleScheduleMessage = useCallback(async (message: string, scheduledTime: Date) => {
    // TODO: Implement scheduled message logic
    toast({
      title: "Mensagem agendada",
      description: `Será enviada em ${scheduledTime.toLocaleString()}`,
    });
  }, [toast]);

  const handleVoiceSend = useCallback(async (audioBlob: Blob) => {
    // TODO: Implement voice message sending
    setShowVoiceRecorder(false);
    toast({
      title: "Áudio enviado",
      description: "Mensagem de áudio enviada com sucesso",
    });
  }, [toast]);

  const handleDeleteConversation = useCallback(async () => {
    await deleteConversation(phoneNumber);
    setShowDeleteDialog(false);
    if (onBack) {
      onBack();
    }
  }, [phoneNumber, deleteConversation, onBack]);

  const handleDeleteForMe = useCallback((message: MessageRow) => {
    setMessageToDelete(message);
    setDeletionType('for_me');
    setShowDeleteConfirm(true);
  }, []);

  const handleDeleteForEveryone = useCallback((message: MessageRow) => {
    setMessageToDelete(message);
    setDeletionType('for_everyone');
    setShowDeleteConfirm(true);
  }, []);

  const confirmMessageDeletion = useCallback(async () => {
    if (!messageToDelete) return;

    const result = await deleteMessage(messageToDelete, deletionType);
    if (result.success) {
      setShowDeleteConfirm(false);
      setMessageToDelete(null);
      // Refresh messages
      loadMessages();
    }
  }, [messageToDelete, deletionType, deleteMessage, loadMessages]);

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

  // Memoize grouped messages to avoid recalculation on every render
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  const displayName = contact?.name || formatPhoneNumber(phoneNumber);
  const displayInitials = getInitials(contact?.name, phoneNumber);

  const handleMessageSelect = useCallback((messageId: number) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

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
    <div className="w-full h-full flex flex-col border-x border-border/30">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-chat-header border-b border-sidebar-border shadow-sm min-h-[59px]">
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
          {/* Prominent "Criar Demanda" button for tasks mode */}
          {viewMode === 'tasks' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowCreateTicket(true)}
              className="gap-2 mr-2 bg-primary hover:bg-primary/90"
            >
              <ClipboardList className="h-4 w-4" />
              Criar Demanda
            </Button>
          )}
          
          {/* C2S Send button for vendas department */}
          {activeDepartment === 'vendas' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowC2SModal(true)}
              className="gap-2 mr-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-4 w-4" />
              Enviar para C2S
            </Button>
          )}
          
          {/* Template button for new conversations */}
          {messages.length === 0 && (
            <Button
              variant={viewMode === 'tasks' ? 'outline' : 'default'}
              size="sm"
              onClick={() => setShowQuickTemplate(true)}
              className="gap-2 mr-2"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar Template
            </Button>
          )}
          
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
          
          <DeletedMessagesTrash>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSettings(true)}
              className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full text-gray-600"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DeletedMessagesTrash>
        </div>
      </div>

      {/* Search and Flags Filter - positioned right after header */}
      {(showSearch || selectedFlags.length > 0) && (
        <div className="border-b border-sidebar-border bg-background p-2 space-y-2">
          {showSearch && (
            <MessageSearch
              messages={messages}
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              onMessageSelect={handleMessageSelect}
            />
          )}
          
          <MessageFlagsFilter
            phoneNumber={phoneNumber}
            onFilterChange={setSelectedFlags}
          />
        </div>
      )}

      {/* AI Handover Banner */}
      <AIHandoverBanner conversationId={conversationId} phoneNumber={phoneNumber} />

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
          <div className="py-1 px-1 space-y-1 sm:space-y-1.5 md:space-y-2">
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
                      onDeleteForMe={handleDeleteForMe}
                      onDeleteForEveryone={handleDeleteForEveryone}
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

      {/* Quick Actions Menu and Input */}
      <div className="bg-chat-header px-4 py-2">
        {showVoiceRecorder ? (
          <VoiceRecorder
            onSendAudio={handleVoiceSend}
            onCancel={() => setShowVoiceRecorder(false)}
            className="mx-4 mb-4"
          />
        ) : (
          <div className="space-y-2">
            {/* Quick Actions Menu */}
            <QuickActionsMenu
              onCreateTicket={() => setShowCreateTicket(true)}
              onViewProfile={() => setShowProfile(true)}
              onDeleteConversation={() => setShowDeleteDialog(true)}
              viewMode={viewMode}
              disabled={sending}
            />
            
            {/* Message Composer */}
            <MessageComposer
              onSendMessage={sendMessage}
              onSendMedia={async (mediaUrl, mediaType, caption, filename, attendantName) => {
                const result = await sendMediaViaHook({
                  to: phoneNumber,
                  mediaUrl,
                  mediaType,
                  caption,
                  filename,
                  conversationId: conversationId,
                  attendantName,
                  departmentCode: conversationData?.department_code,
                });
                return result.success;
              }}
              disabled={sending}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              replyTo={replyTo}
              onVoiceRecord={() => setShowVoiceRecorder(true)}
              selectedContact={phoneNumber}
              departmentCode={conversationData?.department_code}
              attendantControls={
                <Button
                  variant={isAIActive ? "default" : "outline"}
                  size="sm"
                  onClick={isAIActive ? takeoverConversation : releaseToAI}
                  disabled={aiLoading}
                  className={cn(
                    "h-8 gap-2 transition-all",
                    isAIActive && "bg-primary text-primary-foreground"
                  )}
                >
                  {isAIActive ? (
                    <>
                      <User className="h-4 w-4" />
                      <span className="hidden sm:inline">Assumir</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4" />
                      <span className="hidden sm:inline">Ligar IA</span>
                    </>
                  )}
                </Button>
              }
            />
          </div>
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

      <DeleteConversationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        phoneNumber={phoneNumber}
        contactName={contact?.name}
        onConfirm={handleDeleteConversation}
        isDeleting={isDeleting}
      />

      <QuickTemplateSender
        phoneNumber={phoneNumber}
        open={showQuickTemplate}
        onOpenChange={setShowQuickTemplate}
        onSuccess={() => {
          setShowQuickTemplate(false);
          loadMessages();
        }}
      />

      <DeleteMessageConfirmation
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        message={messageToDelete}
        deletionType={deletionType}
        onConfirm={confirmMessageDeletion}
        isDeleting={isDeletingMessage}
      />

      {/* C2S Modal for vendas */}
      <SendToC2SModal
        open={showC2SModal}
        onOpenChange={setShowC2SModal}
        phoneNumber={phoneNumber}
        contactName={contact?.name}
        contactEmail={contact?.email}
        contactId={contact?.id}
        conversationHistory={messages
          .filter(m => m.body)
          .slice(-20)
          .map(m => `[${m.direction === 'inbound' ? 'Cliente' : 'Operador'}]: ${m.body}`)
          .join('\n')}
      />
    </div>
  );
}