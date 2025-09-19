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
    
    // WhatsApp-style status icons
    return <CheckCheck className="h-3 w-3 text-white/80 ml-1" />;
  };

  return (
    <div className={cn(
      "flex mb-2",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] relative group",
        hasMedia ? "rounded-lg overflow-hidden" : "rounded-lg",
        isOutbound 
          ? "bg-green-500 text-white ml-16 rounded-br-sm shadow-sm" 
          : "bg-white border border-border/20 mr-16 rounded-bl-sm shadow-sm"
      )}>
        {/* Template badge */}
        {isTemplate && (
          <div className={cn("px-3 pt-2", hasMedia && "px-2")}>
            <Badge variant="secondary" className="text-xs mb-1">
              Mensagem de template
            </Badge>
          </div>
        )}

        {/* Media Content */}
        {hasMedia && (
          <div className="mb-1">
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
          <div className={cn("mb-1", hasMedia ? "px-2" : "px-3")}>
            <InteractiveMessage
              interactive={interactive}
              isOutbound={isOutbound}
            />
          </div>
        )}
        
        {/* Text Content */}
        {(!hasMedia || (message.body && message.body.trim() !== message.media_caption?.trim())) && (
          <div className={cn(hasMedia ? "px-2 pb-1" : "px-3 py-2")}>
            <p className={cn(
              "text-sm leading-relaxed whitespace-pre-wrap break-words",
              isOutbound ? "text-white" : "text-gray-900"
            )}>
              {message.body || "Mensagem sem conteúdo"}
            </p>
          </div>
        )}
        
        {/* Timestamp and Status */}
        <div className={cn(
          "flex items-center justify-end gap-1 px-3 pb-2 pt-1",
          hasMedia && "px-2",
          isOutbound ? "text-white/70" : "text-gray-500"
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