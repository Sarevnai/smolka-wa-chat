import { useState, useEffect } from "react";
import { Search, MessageSquare, ArrowLeft, Volume2, VolumeX, Plus, User, Building2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { normalizePhone, getPhoneSearchPattern } from "@/lib/phone-utils";
import { usePinnedConversations } from "@/hooks/usePinnedConversations";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useNavigate } from "react-router-dom";
import { useRealtimeMessages } from "@/contexts/RealtimeMessagesContext";
import { useWhatsAppTemplates } from "@/hooks/useWhatsAppTemplates";
import { useQuickTemplate } from "@/hooks/useQuickTemplate";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserDepartment } from "@/hooks/useUserDepartment";
import { Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type DepartmentType = Database['public']['Enums']['department_type'];

interface Conversation {
  phoneNumber: string;
  lastMessage: MessageRow;
  messageCount: number;
  unreadCount: number;
  contactName?: string;
  contactType?: string;
  conversationId?: string;
  departmentCode?: DepartmentType | null;
  stageName?: string;
  stageColor?: string;
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
  const [selectedContactPhone, setSelectedContactPhone] = useState<string>("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [searchedContacts, setSearchedContacts] = useState<any[]>([]);
  const { toast } = useToast();
  const { pinnedConversations } = usePinnedConversations();
  const { soundEnabled, toggleSound } = useNotificationSound();
  const navigate = useNavigate();
  const { data: templates } = useWhatsAppTemplates();
  const { sendTemplate, isLoading: sendingTemplate } = useQuickTemplate();
  const { profile } = useAuth();
  const permissions = usePermissions();
  const { department: userDepartment, loading: deptLoading } = useUserDepartment();

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Query conversations table with department filter
      // Admins see all, others see only their department or unassigned (NULL)
      let conversationsQuery = supabase
        .from("conversations")
        .select(`
          id,
          phone_number,
          department_code,
          stage_id,
          status,
          last_message_at,
          contact_id,
          contacts:contact_id (
            name,
            contact_type
          ),
          conversation_stages:stage_id (
            name,
            color
          )
        `)
        .eq("status", "active")
        .order("last_message_at", { ascending: false })
        .limit(100);
      
      // Filter by department if user is not admin
      if (!permissions.isAdmin && userDepartment) {
        conversationsQuery = conversationsQuery.or(`department_code.eq.${userDepartment},department_code.is.null`);
      } else if (!permissions.isAdmin) {
        // User has no department, show only unassigned
        conversationsQuery = conversationsQuery.is("department_code", null);
      }
      // Admins see all conversations

      const { data: conversationsData, error: convError } = await conversationsQuery;

      if (convError) throw convError;

      // Get the last message for each conversation
      const phoneNumbers = (conversationsData || []).map(c => c.phone_number);
      
      if (phoneNumbers.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get last message for each phone number
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .or(phoneNumbers.map(p => `wa_from.eq.${p},wa_to.eq.${p}`).join(','))
        .order("wa_timestamp", { ascending: false });

      if (messagesError) throw messagesError;

      // Group messages by phone number and get last one
      const lastMessageMap = new Map<string, MessageRow>();
      messages?.forEach((message) => {
        const phoneNumber = message.direction === "inbound" ? message.wa_from : message.wa_to;
        if (phoneNumber && !lastMessageMap.has(phoneNumber)) {
          lastMessageMap.set(phoneNumber, message as MessageRow);
        }
      });

      // Build conversation list
      const conversationList: Conversation[] = (conversationsData || []).map((conv: any) => {
        const lastMessage = lastMessageMap.get(conv.phone_number);
        const contact = conv.contacts;
        const stage = conv.conversation_stages;
        
        return {
          phoneNumber: conv.phone_number,
          lastMessage: lastMessage || {
            id: 0,
            body: "Nova conversa",
            wa_timestamp: conv.last_message_at,
            direction: "inbound",
          } as MessageRow,
          messageCount: 0,
          unreadCount: 0,
          contactName: contact?.name,
          contactType: contact?.contact_type,
          conversationId: conv.id,
          departmentCode: conv.department_code,
          stageName: stage?.name,
          stageColor: stage?.color,
        };
      });

      // Sort conversations: pinned first, then by last message timestamp
      conversationList.sort((a, b) => {
        const aIsPinned = pinnedConversations.includes(a.phoneNumber);
        const bIsPinned = pinnedConversations.includes(b.phoneNumber);
        
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        
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
    if (!deptLoading) {
      loadConversations();
    }
  }, [userDepartment, permissions.isAdmin, deptLoading]);

  // Use centralized realtime context
  const { lastMessage } = useRealtimeMessages();

  useEffect(() => {
    if (!lastMessage) return;

    console.log('📨 [ChatList] Processando mensagem do contexto:', lastMessage.id);
    
    // Get phone number from message
    const phoneNumber = lastMessage.direction === 'inbound' 
      ? lastMessage.wa_from 
      : lastMessage.wa_to;
    
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
          lastMessage,
          messageCount: conversation.messageCount + 1,
          unreadCount: selectedContact === phoneNumber 
            ? conversation.unreadCount 
            : conversation.unreadCount + 1
        };
        
        // Move to top (respecting pinned conversations)
        const movedConversation = updated.splice(existingIndex, 1)[0];
        const isPinned = pinnedConversations.includes(phoneNumber);
        
        if (isPinned) {
          updated.unshift(movedConversation);
        } else {
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
      // New conversation detected - reload from database to get proper department/stage info
      console.log('🆕 [ChatList] Nova conversa detectada, recarregando...');
      loadConversations();
    }
  }, [lastMessage, selectedContact, pinnedConversations]);

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

  const handleContactSelect = async (phone: string) => {
    // Verificar permissão
    if (!permissions.canSendMessages) {
      toast({
        title: "Permissão negada",
        description: "Você não tem permissão para enviar mensagens. Entre em contato com um administrador.",
        variant: "destructive"
      });
      return;
    }

    // Validação: verificar se templates estão carregados
    if (!templates || templates.length === 0) {
      toast({
        title: "Templates não carregados",
        description: "Aguarde o carregamento dos templates ou recarregue a página.",
        variant: "destructive"
      });
      return;
    }
    
    // Buscar template específico
    const template = templates.find(t => t.template_name === 'iniciar_atendimento');
    
    if (!template) {
      toast({
        title: "Template não encontrado",
        description: "O template 'iniciar_atendimento' não está configurado. Entre em contato com o administrador.",
        variant: "destructive"
      });
      return;
    }
    
    // Preparar variáveis
    const variables: Record<string, string> = {
      user: profile?.full_name || 'Atendente'
    };
    
    // Iniciar envio
    setSelectedContactPhone(phone);
    
    try {
      console.log('📤 Enviando template iniciar_atendimento para:', phone);
      
      // Aguardar envio completo
      await sendTemplate({
        phoneNumber: phone,
        templateName: template.template_name,
        languageCode: template.language,
        variables
      });
      
      console.log('✅ Template enviado com sucesso!');
      
      // Fechar modal APÓS envio bem-sucedido
      setShowContactModal(false);
      
      // Aguardar um pouco para garantir que mensagem foi salva no banco
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navegar para conversa
      navigate(`/chat/${phone}`);
      
    } catch (error) {
      console.error('❌ Erro ao enviar template:', error);
      
      // Toast de erro mais detalhado (o hook já mostra um, mas vamos garantir)
      if (error instanceof Error && !error.message.includes('Template enviado')) {
        toast({
          title: "Erro ao iniciar conversa",
          description: error.message || "Não foi possível enviar a mensagem inicial. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      setSelectedContactPhone("");
    }
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

  const getDepartmentLabel = (code: DepartmentType | null | undefined): string => {
    switch (code) {
      case 'locacao': return 'Locação';
      case 'vendas': return 'Vendas';
      case 'administrativo': return 'Administrativo';
      default: return 'Todos';
    }
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
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-medium">Chat</h1>
            {userDepartment && !permissions.isAdmin && (
              <Badge variant="secondary" className="text-xs bg-white/20 hover:bg-white/30">
                <Building2 className="h-3 w-3 mr-1" />
                {getDepartmentLabel(userDepartment)}
              </Badge>
            )}
            {permissions.isAdmin && (
              <Badge variant="secondary" className="text-xs bg-white/20 hover:bg-white/30">
                Admin
              </Badge>
            )}
          </div>
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
                    stageName={conversation.stageName}
                    stageColor={conversation.stageColor}
                    departmentCode={conversation.departmentCode}
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
                    onClick={() => handleContactSelect(contact.phone)}
                    disabled={sendingTemplate}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 transition-colors border-b border-border/50",
                      sendingTemplate 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-accent group cursor-pointer"
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
      {permissions.canSendMessages && (
        <Button
          onClick={() => setShowContactModal(true)}
          className="absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all"
          size="icon"
          title="Iniciar nova conversa"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}
    </div>

    {/* Contact Selection Modal */}
    <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contato..."
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            {filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum contato encontrado
              </div>
            ) : (
              <div className="space-y-1 pb-2">
                {filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleContactSelect(contact.phone)}
                    disabled={sendingTemplate}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      sendingTemplate 
                        ? "opacity-50 cursor-not-allowed" 
                        : "hover:bg-muted"
                    )}
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
          
          {sendingTemplate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 border-t flex-shrink-0">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Iniciando conversa...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}