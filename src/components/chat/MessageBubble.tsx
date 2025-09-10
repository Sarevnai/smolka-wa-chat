import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: MessageRow;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  
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
        "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
        isOutbound 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-card border border-border rounded-bl-md"
      )}>
        <p className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap break-words",
          isOutbound ? "text-primary-foreground" : "text-foreground"
        )}>
          {message.body || "Mensagem sem conteúdo"}
        </p>
        
        <div className={cn(
          "flex items-center justify-end gap-1 mt-1",
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