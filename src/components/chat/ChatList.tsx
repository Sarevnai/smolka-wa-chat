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
import { normalizePhone, getPhoneSearchPattern } from "@/lib/phone-utils";
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
  const [searchedContacts, setSearchedContacts] = useState<any[]>([]);
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

  // Real-time listener for new messages
  useEffect(() => {
    console.log('🔔 Configurando listener realtime para ChatList');
    
    const channel = supabase
      .channel('chat-list-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          const newMessage = payload.new as MessageRow;
          console.log('📨 Nova mensagem recebida no ChatList:', newMessage.id);
          
          // Get phone number from message
          const phoneNumber = newMessage.direction === 'inbound' 
            ? newMessage.wa_from 
            : newMessage.wa_to;
          
          if (!phoneNumber) return;
          
          // Check if conversation already exists
          const existingIndex = conversations.findIndex(c => c.phoneNumber === phoneNumber);
          
          if (existingIndex >= 0) {
            // Update existing conversation
            setConversations(prev => {
              const updated = [...prev];
              const conversation = updated[existingIndex];
              
              // Update conversation data
              updated[existingIndex] = {
                ...conversation,
                lastMessage: newMessage,
                messageCount: conversation.messageCount + 1,
                unreadCount: selectedContact === phoneNumber 
                  ? conversation.unreadCount 
                  : conversation.unreadCount + 1
              };
              
              // Move to top (respecting pinned conversations)
              const movedConversation = updated.splice(existingIndex, 1)[0];
              const isPinned = pinnedConversations.includes(phoneNumber);
              
              if (isPinned) {
                // Add to beginning (pinned section)
                updated.unshift(movedConversation);
              } else {
                // Add after pinned conversations
                const firstUnpinnedIndex = updated.findIndex(c => 
                  !pinnedConversations.includes(c.phoneNumber)
                );
                if (firstUnpinnedIndex >= 0) {
                  updated.splice(firstUnpinnedIndex, 0, movedConversation);
                } else {
                  updated.push(movedConversation);
                }
              }
              
              return updated;
            });
          } else {
            // New conversation - fetch contact info and add to list
            console.log('🆕 Nova conversa detectada, carregando dados do contato...');
            
            const { data: contact } = await supabase
              .from('contacts')
              .select('name, contact_type')
              .eq('phone', phoneNumber)
              .maybeSingle();
            
            const newConversation: Conversation = {
              phoneNumber,
              lastMessage: newMessage,
              messageCount: 1,
              unreadCount: selectedContact === phoneNumber ? 0 : 1,
              contactName: contact?.name,
              contactType: contact?.contact_type
            };
            
            setConversations(prev => {
              const isPinned = pinnedConversations.includes(phoneNumber);
              
              if (isPinned) {
                return [newConversation, ...prev];
              } else {
                // Add after pinned conversations
                const firstUnpinnedIndex = prev.findIndex(c => 
                  !pinnedConversations.includes(c.phoneNumber)
                );
                if (firstUnpinnedIndex >= 0) {
                  const updated = [...prev];
                  updated.splice(firstUnpinnedIndex, 0, newConversation);
                  return updated;
                } else {
                  return [...prev, newConversation];
                }
              }
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMessage = payload.new as MessageRow;
          console.log('📝 Mensagem atualizada no ChatList:', updatedMessage.id);
          
          // If the message is deleted, update the conversation preview
          if (updatedMessage.deleted_for_everyone) {
            const phoneNumber = updatedMessage.direction === 'inbound' 
              ? updatedMessage.wa_from 
              : updatedMessage.wa_to;
            
            if (!phoneNumber) return;
            
            // Find conversation and check if this is the last message
            setConversations(prev => {
              const index = prev.findIndex(c => c.phoneNumber === phoneNumber);
              if (index < 0) return prev;
              
              const conversation = prev[index];
              if (conversation.lastMessage.id === updatedMessage.id) {
                // Last message was updated, update the conversation
                const updated = [...prev];
                updated[index] = {
                  ...conversation,
                  lastMessage: updatedMessage
                };
                return updated;
              }
              
              return prev;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Status da subscrição ChatList:', status);
      });

    return () => {
      console.log('🔌 Removendo canal realtime do ChatList');
      supabase.removeChannel(channel);
    };
  }, [selectedContact, pinnedConversations, conversations]);

  // Load contacts for the "New Conversation" modal
  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, contact_type")
        .eq("status", "ativo")
        .order("name", { nullsFirst: false }) // Contacts without name come last
        .order("phone"); // Fallback to phone
      
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

  // Search contacts in database
  const searchContactsInDatabase = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchedContacts([]);
      return;
    }

    try {
      const term = query.trim();
      const isPhoneSearch = /[\d+\-() ]/.test(term) && term.length >= 4;
      
      let supabaseQuery = supabase
        .from("contacts")
        .select("id, name, phone, contact_type")
        .eq("status", "ativo")
        .limit(10);

      if (isPhoneSearch) {
        const phonePattern = getPhoneSearchPattern(term);
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${term}%,phone.ilike.%${phonePattern}%`
        );
      } else {
        supabaseQuery = supabaseQuery.or(
          `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
        );
      }

      const { data, error } = await supabaseQuery;
      
      if (error) throw error;

      // Filter contacts that already have active conversations
      const existingPhones = new Set(conversations.map(c => c.phoneNumber));
      const newContacts = (data || []).filter(
        contact => !existingPhones.has(contact.phone)
      );

      setSearchedContacts(newContacts);
    } catch (error) {
      console.error("Error searching contacts:", error);
      setSearchedContacts([]);
    }
  };

  // Real-time search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      searchContactsInDatabase(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, conversations]);

  const filteredContacts = contacts.filter(contact => {
    const searchLower = contactSearch.toLowerCase();
    const nameMatch = contact.name?.toLowerCase().includes(searchLower);
    
    // Normalize both search term and stored phone for comparison
    const normalizedSearch = normalizePhone(contactSearch);
    const normalizedPhone = normalizePhone(contact.phone);
    const phoneMatch = normalizedPhone.includes(normalizedSearch);
    
    return nameMatch || phoneMatch;
  });

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
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Pesquisar conversa"
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
        ) : (
          <div className="space-y-0">
            {/* Existing Conversations */}
            {filteredConversations.length > 0 && (
              <div>
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

            {/* Divider if both sections have results */}
            {filteredConversations.length > 0 && searchedContacts.length > 0 && (
              <div className="px-4 py-2 bg-muted/50">
                <p className="text-xs font-medium text-muted-foreground">
                  CONTATOS DO BANCO
                </p>
              </div>
            )}

            {/* Searched Contacts from Database */}
            {searchedContacts.length > 0 && (
              <div className="space-y-0">
                {searchedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      setSelectedContactPhone(contact.phone);
                      setShowTemplateSender(true);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors border-b border-border/50",
                      "group cursor-pointer"
                    )}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {contact.name || contact.phone}
                        </p>
                        {contact.contact_type && (
                          <Badge variant="outline" className="text-xs">
                            {contact.contact_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      <p className="text-xs text-primary mt-1">
                        Clique para iniciar conversa
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state when no results */}
            {filteredConversations.length === 0 && searchedContacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
                </div>
                <h3 className="text-base font-medium text-foreground mb-2">
                  {searchQuery ? "Nenhum resultado encontrado" : "Sem conversas"}
                </h3>
                <p className="text-sm text-muted-foreground text-center max-w-xs">
                  {searchQuery 
                    ? "Tente usar outros termos de busca ou inicie uma nova conversa"
                    : "As conversas aparecerão aqui quando você receber mensagens"
                  }
                </p>
              </div>
            )}
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