import { 
  Reply, 
  Copy, 
  Forward, 
  Star, 
  Trash2, 
  Download,
  Info,
  UserX
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MessageRow } from "@/lib/messages";

interface MessageContextMenuProps {
  message: MessageRow;
  children: React.ReactNode;
  onReply?: (message: MessageRow) => void;
  onCopy?: (message: MessageRow) => void;
  onForward?: (message: MessageRow) => void;
  onStar?: (message: MessageRow) => void;
  onDelete?: (message: MessageRow) => void;
  onDeleteForMe?: (message: MessageRow) => void;
  onDeleteForEveryone?: (message: MessageRow) => void;
  onDownload?: (message: MessageRow) => void;
  onInfo?: (message: MessageRow) => void;
}

export function MessageContextMenu({
  message,
  children,
  onReply,
  onCopy,
  onForward,
  onStar,
  onDelete,
  onDeleteForMe,
  onDeleteForEveryone,
  onDownload,
  onInfo
}: MessageContextMenuProps) {
  const isOutbound = message.direction === "outbound";
  const hasMedia = message.media_type && message.media_type !== 'text';
  
  // Debug log
  console.log('MessageContextMenu:', { 
    messageId: message.id, 
    direction: message.direction, 
    isOutbound, 
    hasDeleteForEveryone: !!onDeleteForEveryone 
  });

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onReply && (
          <ContextMenuItem onClick={() => onReply(message)}>
            <Reply className="mr-2 h-4 w-4" />
            Responder
          </ContextMenuItem>
        )}
        
        {onCopy && message.body && (
          <ContextMenuItem onClick={() => onCopy(message)}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar texto
          </ContextMenuItem>
        )}
        
        {onForward && (
          <ContextMenuItem onClick={() => onForward(message)}>
            <Forward className="mr-2 h-4 w-4" />
            Encaminhar
          </ContextMenuItem>
        )}
        
        {onStar && (
          <ContextMenuItem onClick={() => onStar(message)}>
            <Star className="mr-2 h-4 w-4" />
            Favoritar
          </ContextMenuItem>
        )}
        
        {hasMedia && onDownload && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onDownload(message)}>
              <Download className="mr-2 h-4 w-4" />
              Baixar mídia
            </ContextMenuItem>
          </>
        )}
        
        {onInfo && (
          <ContextMenuItem onClick={() => onInfo(message)}>
            <Info className="mr-2 h-4 w-4" />
            Informações
          </ContextMenuItem>
        )}
        
        {(onDeleteForMe || onDeleteForEveryone || onDelete) && (
          <>
            <ContextMenuSeparator />
            
            {onDeleteForMe && (
              <ContextMenuItem 
                onClick={() => onDeleteForMe(message)}
                className="text-red-600 focus:text-red-600"
              >
                <UserX className="mr-2 h-4 w-4" />
                Excluir só para mim
              </ContextMenuItem>
            )}
            
            {onDeleteForEveryone && isOutbound && (
              <ContextMenuItem 
                onClick={() => onDeleteForEveryone(message)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir para todos
              </ContextMenuItem>
            )}

            {/* Legacy delete option for backward compatibility */}
            {onDelete && !onDeleteForMe && !onDeleteForEveryone && isOutbound && (
              <ContextMenuItem 
                onClick={() => onDelete(message)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar mensagem
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}