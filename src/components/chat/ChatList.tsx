import { useState, useEffect } from "react";
import { Search, MessageSquare, ArrowLeft, Volume2, VolumeX, Plus, User } from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ConversationItem } from "./ConversationItem";
import { QuickTemplateSender } from "./QuickTemplateSender";
import { supabase } from "@/integrations/supabase/client";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { usePinnedConversations } from "@/hooks/usePinnedConversations";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNavigate } from "react-router-dom";

interface Conversation {
  phoneNumber: string;
  lastMessage: MessageRow;
  messageCount: number;
  unreadCount: number;
  contactName?: string;
  contactType?: string;
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'inquilino' | 'proprietario'>('all');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTemplateSender, setShowTemplateSender] = useState(false);
  const [selectedContactPhone, setSelectedContactPhone] = useState<string>("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const { toast } = useToast();
  const { pinnedConversations } = usePinnedConversations();
  const { soundEnabled, toggleSound } = useNotificationSound();
  const navigate = useNavigate();

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Optimized query: Get only the most recent message per conversation
      // First, get unique phone numbers from recent messages
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .order("wa_timestamp", { ascending: false })
        .limit(200); // Reduced from 1000 for better performance

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

      // Get all unique phone numbers
      const phoneNumbers = Array.from(conversationMap.keys());
      
      // Fetch contact names for all phone numbers in a single query
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("phone, name, contact_type")
        .in("phone", phoneNumbers);

      if (contactsError) {
        console.error("Error loading contacts:", contactsError);
      }

      // Create a map of phone numbers to contact names
      const contactMap = new Map<string, { name?: string; contact_type?: string }>();
      contacts?.forEach((contact) => {
        if (contact.phone) {
          contactMap.set(contact.phone, {
            name: contact.name,
            contact_type: contact.contact_type
          });
        }
      });

      // Convert to conversation objects with contact names
      const conversationList: Conversation[] = Array.from(conversationMap.entries()).map(([phoneNumber, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(b.wa_timestamp || b.created_at || "").getTime() - 
          new Date(a.wa_timestamp || a.created_at || "").getTime()
        );
        
        const contactInfo = contactMap.get(phoneNumber);
        
        return {
          phoneNumber,
          lastMessage: sortedMessages[0],
          messageCount: messages.length,
          unreadCount: 0, // TODO: Implement unread count logic
          contactName: contactInfo?.name,
          contactType: contactInfo?.contact_type
        };
      });

      // Sort conversations: pinned first, then by last message timestamp
      conversationList.sort((a, b) => {
        const aIsPinned = pinnedConversations.includes(a.phoneNumber);
        const bIsPinned = pinnedConversations.includes(b.phoneNumber);
        
        // Pinned conversations first
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        
        // Then sort by last message timestamp
        return new Date(b.lastMessage.wa_timestamp || b.lastMessage.created_at || "").getTime() - 
               new Date(a.lastMessage.wa_timestamp || a.lastMessage.created_at || "").getTime();
      });

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
  }, []);

  // Load contacts for the "New Conversation" modal
  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, contact_type")
        .eq("status", "ativo")
        .order("name");
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
      toast({
        title: "Erro ao carregar contatos",
        description: "Não foi possível carregar a lista de contatos.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (showContactModal) {
      loadContacts();
    }
  }, [showContactModal]);

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.phone?.includes(contactSearch)
  );

  const handleContactSelect = (phone: string) => {
    setSelectedContactPhone(phone);
    setShowContactModal(false);
    setShowTemplateSender(true);
  };

  const handleTemplateSendSuccess = () => {
    navigate(`/chat/${selectedContactPhone}`);
    setShowTemplateSender(false);
    setSelectedContactPhone("");
  };

  const filteredConversations = conversations.filter(conversation => {
    // Apply search filter
    const matchesSearch = conversation.phoneNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (conversation.contactName && conversation.contactName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    // Apply contact type filter
    if (activeFilter === 'inquilino') {
      return conversation.contactType === 'inquilino';
    } else if (activeFilter === 'proprietario') {
      return conversation.contactType === 'proprietario';
    }
    
    return true; // 'all' filter
  });

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
    <>
      <div className="h-full flex flex-col bg-sidebar relative">
      {/* Chat Header */}
      <div className="px-4 py-2 bg-sidebar-header text-sidebar-primary-foreground h-[59px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0 text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-medium">Chat</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Pesquisar ou começar uma nova conversa"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/90 border-0 rounded-lg h-8 text-sm text-gray-900 placeholder:text-gray-500"
            />
          </div>
          
          {/* Sound toggle button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSound}
            className="h-8 w-8 p-0 text-white hover:bg-white/10"
            title={soundEnabled ? "Desativar notificações sonoras" : "Ativar notificações sonoras"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      
      {/* Filter Tabs */}
      <div className="px-4 py-1.5 bg-sidebar border-b border-sidebar-border">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-xs h-6 px-2 transition-colors",
              activeFilter === 'all' 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-muted-foreground hover:bg-sidebar-accent/50"
            )}
            onClick={() => setActiveFilter('all')}
          >
            Todos
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-xs h-6 px-2 transition-colors",
              activeFilter === 'inquilino' 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-muted-foreground hover:bg-sidebar-accent/50"
            )}
            onClick={() => setActiveFilter('inquilino')}
          >
            Inquilinos
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "text-xs h-6 px-2 transition-colors",
              activeFilter === 'proprietario' 
                ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                : "text-muted-foreground hover:bg-sidebar-accent/50"
            )}
            onClick={() => setActiveFilter('proprietario')}
          >
            Proprietários
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">
              {searchQuery ? "Nenhuma conversa encontrada" : "Sem conversas"}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              {searchQuery 
                ? "Tente usar outros termos de busca"
                : "As conversas aparecerão aqui quando você receber mensagens"
              }
            </p>
          </div>
        ) : (
          <div className="space-y-0">
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

      {/* Floating Action Button - New Conversation */}
      <Button
        onClick={() => setShowContactModal(true)}
        className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
        size="icon"
        title="Iniciar nova conversa"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>

    {/* Contact Selection Modal */}
    <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-[400px]">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum contato encontrado
              </div>
            ) : (
              <div className="space-y-1">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleContactSelect(contact.phone)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors text-left"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name || contact.phone}</p>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                    </div>
                    {contact.contact_type && (
                      <Badge variant="outline" className="text-xs">
                        {contact.contact_type}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>

    {/* Template Sender Modal */}
    {selectedContactPhone && (
      <QuickTemplateSender
        phoneNumber={selectedContactPhone}
        open={showTemplateSender}
        onOpenChange={setShowTemplateSender}
        onSuccess={handleTemplateSendSuccess}
      />
    )}
    </>
  );
}