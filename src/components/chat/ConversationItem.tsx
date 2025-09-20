import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContactByPhone } from "@/hooks/useContacts";
import { useDeleteConversation } from "@/hooks/useDeleteConversation";
import { cn, formatPhoneNumber } from "@/lib/utils";
import { SparklesIcon, Building2, Key, FileText, MoreVertical, Trash2 } from "lucide-react";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { useState } from "react";

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
  const { deleteConversation, isDeleting } = useDeleteConversation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteConversation = async () => {
    const result = await deleteConversation(phoneNumber);
    if (result.success) {
      setShowDeleteDialog(false);
    }
  };

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
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-sidebar-accent cursor-pointer group border-b border-sidebar-border/30",
        isSelected && "bg-sidebar-accent"
      )}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarFallback className="bg-gray-400 text-white font-medium text-sm">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate text-base">
              {displayName}
            </h3>
            {isAutoDetectedName && (
              <SparklesIcon className="h-3 w-3 text-primary/60 flex-shrink-0" />
            )}
            {typeInfo && TypeIcon && (
              <Badge variant={typeInfo.variant} className="flex items-center gap-1 text-xs px-1.5 py-0.5">
                <TypeIcon className="h-3 w-3" />
                <span className="hidden sm:inline">{typeInfo.label}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-500">
              {formatLastMessageTime(lastMessage.wa_timestamp || lastMessage.created_at)}
            </span>
            {unreadCount > 0 && (
              <div className="bg-primary text-white text-xs font-medium rounded-full h-5 min-w-5 flex items-center justify-center px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <p className="text-sm text-gray-600 truncate flex-1">
            {lastMessage.direction === "outbound" && (
              <span className="text-gray-500">✓✓ </span>
            )}
            {truncateMessage(lastMessage.body)}
          </p>
          
          {contact?.contracts && contact.contracts.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs px-1.5 py-0.5">
              <FileText className="h-3 w-3" />
              <span>{contact.contracts[0].contract_number}</span>
            </Badge>
          )}
        </div>
        
        {contact?.name && (
          <p className="text-xs text-gray-500 mt-0.5">
            {formatPhoneNumber(phoneNumber)}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 sm:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir conversa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConversationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        phoneNumber={phoneNumber}
        contactName={contact?.name}
        onConfirm={handleDeleteConversation}
        isDeleting={isDeleting}
      />
    </div>
  );
}