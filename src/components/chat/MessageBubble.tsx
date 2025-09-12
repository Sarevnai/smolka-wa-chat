import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { MediaMessage } from "./MediaMessage";
import { InteractiveMessage } from "./InteractiveMessage";
import { Badge } from "@/components/ui/badge";

interface MessageBubbleProps {
  message: MessageRow;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const hasMedia = message.media_type && message.media_type !== 'text';
  const isTemplate = message.is_template;
  
  // Try to parse interactive content from raw data
  const interactive = message.raw?.interactive || null;
  
  const formatTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  const getStatusIcon = () => {
    if (!isOutbound) return null;
    
    // For now, all outbound messages show as delivered (double check)
    // In a real implementation, you'd track message status from WhatsApp API
    return <CheckCheck className="h-3 w-3 text-primary ml-1" />;
  };

  return (
    <div className={cn(
      "flex",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[75%] rounded-2xl shadow-sm",
        hasMedia ? "p-2" : "px-4 py-2",
        isOutbound 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-card border border-border rounded-bl-md"
      )}>
        {/* Template badge */}
        {isTemplate && (
          <div className={hasMedia ? "px-2 pt-2" : "mb-2"}>
            <Badge variant="secondary" className="text-xs">
              Mensagem de template
            </Badge>
          </div>
        )}

        {/* Media Content */}
        {hasMedia && (
          <div className="mb-2">
            <MediaMessage
              mediaType={message.media_type!}
              mediaUrl={message.media_url}
              caption={message.media_caption}
              filename={message.media_filename}
              mimeType={message.media_mime_type}
              isOutbound={isOutbound}
            />
          </div>
        )}
        
        {/* Interactive Message */}
        {interactive && (
          <div className={hasMedia ? "px-2 mb-2" : "mb-2"}>
            <InteractiveMessage
              interactive={interactive}
              isOutbound={isOutbound}
            />
          </div>
        )}
        
        {/* Text Content - Only show if there's text content or no media */}
        {(!hasMedia || (message.body && message.body.trim() !== message.media_caption?.trim())) && (
          <div className={hasMedia ? "px-2" : ""}>
            <p className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap break-words",
              isOutbound ? "text-primary-foreground" : "text-foreground"
            )}>
              {message.body || "Mensagem sem conteúdo"}
            </p>
          </div>
        )}
        
        {/* Timestamp and Status */}
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
          hasMedia ? "px-2" : "",
          isOutbound ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          <span className="text-xs">
            {formatTime(message.wa_timestamp || message.created_at || "")}
          </span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
}