import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useContactByPhone } from "@/hooks/useContacts";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { SparklesIcon, Building2, Key, FileText } from "lucide-react";

interface ConversationItemProps {
  phoneNumber: string;
  lastMessage: {
    body: string | null;
    direction: string;
    wa_timestamp: string | null;
    created_at: string | null;
  };
  messageCount: number;
  unreadCount: number;
  isSelected: boolean;
  onClick: () => void;
}

export function ConversationItem({
  phoneNumber,
  lastMessage,
  messageCount,
  unreadCount,
  isSelected,
  onClick
}: ConversationItemProps) {
  const { data: contact } = useContactByPhone(phoneNumber);

  const formatLastMessageTime = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 24) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      } else if (diffHours < 48) {
        return "Ontem";
      } else {
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }
    } catch {
      return "";
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

  const truncateMessage = (text: string | null, maxLength: number = 50) => {
    if (!text) return "Sem conteúdo";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const displayName = contact?.name || formatPhoneNumber(phoneNumber);
  const displayInitials = getInitials(contact?.name, phoneNumber);
  const isAutoDetectedName = contact?.name && contact.name !== phoneNumber && !contact.name.includes('@');

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
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/10 border border-primary/20"
      )}
    >
      <Avatar className="h-12 w-12">
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {displayInitials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-medium text-foreground truncate">
              {displayName}
            </p>
            {isAutoDetectedName && (
              <SparklesIcon className="h-3 w-3 text-primary/60 flex-shrink-0" />
            )}
            {typeInfo && TypeIcon && (
              <Badge variant={typeInfo.variant} className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                <TypeIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{typeInfo.label}</span>
              </Badge>
            )}
            {contact?.contracts && contact.contracts.length > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                <FileText className="h-3 w-3" />
                <span>{contact.contracts[0].contract_number}</span>
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatLastMessageTime(lastMessage.wa_timestamp || lastMessage.created_at)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage.direction === "outbound" && "Você: "}
            {truncateMessage(lastMessage.body)}
          </p>
          
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2 h-5 min-w-5 text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>
        
        {contact?.name && (
          <p className="text-xs text-muted-foreground mt-1">
            {formatPhoneNumber(phoneNumber)}
          </p>
        )}
      </div>
    </div>
  );
}