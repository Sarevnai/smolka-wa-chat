import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppDeletedPlaceholderProps {
  message: MessageRow;
  deletionType: 'for_me' | 'for_everyone';
}

export function WhatsAppDeletedPlaceholder({ 
  message, 
  deletionType 
}: WhatsAppDeletedPlaceholderProps) {
  const isOutbound = message.direction === "outbound";
  
  const formatTime = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  };

  // If deleted "for_me", don't show anything
  if (deletionType === 'for_me') {
    return null;
  }

  // If deleted "for_everyone", show WhatsApp-like placeholder
  return (
    <div className={cn(
      "flex mb-1",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[45%] md:max-w-[65%] px-3 py-2 rounded-xl shadow-sm",
        isOutbound 
          ? "bg-message-outbound/20 text-message-text-outbound/60 ml-auto rounded-br-md border-l-4 border-gray-300" 
          : "bg-message-inbound/20 text-message-text-inbound/60 mr-auto rounded-bl-md border-l-4 border-gray-300"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-400/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            </div>
            <span className="text-sm italic text-gray-500">
              Esta mensagem foi excluída
            </span>
          </div>
          <span className="text-xs opacity-60 ml-2">
            {formatTime(message.wa_timestamp || message.created_at || "")}
          </span>
        </div>
      </div>
    </div>
  );
}