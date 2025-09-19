import { Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageRow } from "@/lib/messages";

interface MessageReplyProps {
  message: MessageRow;
  onReply: (message: MessageRow) => void;
  className?: string;
}

interface ReplyPreviewProps {
  replyTo: MessageRow;
  onClose: () => void;
  className?: string;
}

export function MessageReply({ message, onReply, className }: MessageReplyProps) {
  return (
    <button
      onClick={() => onReply(message)}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs",
        "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white",
        "transition-colors duration-200",
        className
      )}
    >
      <Reply className="h-3 w-3" />
      <span>Responder</span>
    </button>
  );
}

export function ReplyPreview({ replyTo, onClose, className }: ReplyPreviewProps) {
  const isOutbound = replyTo.direction === "outbound";
  const displayText = replyTo.body || (replyTo.media_type ? `[${replyTo.media_type?.toUpperCase()}]` : "Mensagem sem conteúdo");
  const truncatedText = displayText.length > 50 ? displayText.substring(0, 50) + "..." : displayText;

  return (
    <div className={cn(
      "flex items-center gap-3 px-6 py-3 mx-4 mb-2 bg-gray-50 border-l-4 border-primary rounded-r-lg animate-slide-in-from-left",
      className
    )}>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <Reply className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">
            {isOutbound ? "Você" : "Contato"}
          </span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{truncatedText}</p>
      </div>
      <button
        onClick={onClose}
        className="h-7 w-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors text-lg font-medium"
      >
        ×
      </button>
    </div>
  );
}