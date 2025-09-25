import { MessageRow } from "@/lib/messages";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DeletedMessageBubbleProps {
  message: MessageRow;
  isDeleted: boolean;
  deletionType?: 'for_me' | 'for_everyone';
  onRestore?: () => void;
  isRestoring?: boolean;
}

export function DeletedMessageBubble({ 
  message, 
  isDeleted, 
  deletionType,
  onRestore,
  isRestoring = false
}: DeletedMessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const timestamp = message.wa_timestamp ? new Date(message.wa_timestamp) : new Date();

  if (isDeleted && deletionType === 'for_everyone') {
    // Show "Esta mensagem foi excluída" like WhatsApp
    return (
      <div className={`flex ${isOutbound ? "justify-end" : "justify-start"} mb-4`}>
        <div className={`max-w-[70%] ${isOutbound ? "bg-primary/10 text-primary" : "bg-muted"} rounded-lg p-3`}>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Trash2 className="h-4 w-4" />
            <span className="italic">Esta mensagem foi excluída</span>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {formatDistanceToNow(timestamp, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </div>
        </div>
      </div>
    );
  }

  if (isDeleted && deletionType === 'for_me') {
    // Don't show anything for "for_me" deletions
    return null;
  }

  // If this is in the trash/restore view, show the original message with restore option
  if (onRestore) {
    return (
      <div className="flex items-start gap-3 p-4 border rounded-lg bg-muted/50">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Excluída {deletionType === 'for_everyone' ? 'para todos' : 'para você'}
            </span>
          </div>
          
          {message.body && (
            <p className="text-sm mb-2">{message.body}</p>
          )}
          
          {message.media_type && message.media_type !== 'text' && (
            <div className="text-sm text-muted-foreground mb-2">
              📎 {message.media_type}
              {message.media_filename && ` - ${message.media_filename}`}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            {formatDistanceToNow(timestamp, { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </div>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRestore}
              disabled={isRestoring}
              className="shrink-0"
            >
              <RotateCcw className={`h-4 w-4 ${isRestoring ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Restaurar mensagem
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  // Return the original message if not deleted
  return null;
}