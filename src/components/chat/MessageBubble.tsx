import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { MediaMessage } from "./MediaMessage";
import { InteractiveMessage } from "./InteractiveMessage";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import { MessageContextMenu } from "./MessageContextMenu";
import { EmojiReactions } from "./EmojiReactions";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface MessageBubbleProps {
  message: MessageRow;
  isLast?: boolean;
  onReply?: (message: MessageRow) => void;
  onForward?: (message: MessageRow) => void;
}

export function MessageBubble({ message, isLast, onReply, onForward }: MessageBubbleProps) {
  const [reactions, setReactions] = useState([
    { emoji: "👍", count: 0, users: [], hasUserReacted: false }
  ]);
  const { toast } = useToast();
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

  // Simulate message status (in production, this would come from real data)
  const getMessageStatus = () => {
    if (!isOutbound) return null;
    // Random status for demo (replace with real logic)
    const statuses = ['sent', 'delivered', 'read'] as const;
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const handleCopy = (message: MessageRow) => {
    if (message.body) {
      navigator.clipboard.writeText(message.body);
      toast({
        title: "Texto copiado",
        description: "O texto foi copiado para a área de transferência.",
      });
    }
  };

  const handleReply = (message: MessageRow) => {
    onReply?.(message);
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    setReactions(prev => prev.map(r => 
      r.emoji === emoji 
        ? { ...r, count: r.count + 1, hasUserReacted: true }
        : r
    ));
  };

  const handleRemoveReaction = (messageId: string, emoji: string) => {
    setReactions(prev => prev.map(r => 
      r.emoji === emoji 
        ? { ...r, count: Math.max(0, r.count - 1), hasUserReacted: false }
        : r
    ));
  };

  return (
    <div className={cn(
      "flex mb-2",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <MessageContextMenu
        message={message}
        onReply={handleReply}
        onCopy={handleCopy}
      >
        <div className={cn(
          "max-w-[65%] relative group",
          hasMedia ? "rounded-lg overflow-hidden" : "",
          isOutbound 
            ? "bg-message-outbound text-message-text-outbound ml-auto shadow-sm rounded-lg rounded-br-none" 
            : "bg-message-inbound text-message-text-inbound mr-auto shadow-sm rounded-lg rounded-bl-none border border-gray-200"
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
              isOutbound ? "text-gray-900" : "text-gray-900"
            )}>
              {message.body || "Mensagem sem conteúdo"}
            </p>
          </div>
        )}
        
          {/* Timestamp and Status */}
          <div className={cn(
            "flex items-center justify-end gap-1 px-3 pb-2 pt-1",
            hasMedia && "px-2",
            "text-gray-500"
          )}>
            <span className="text-xs">
              {formatTime(message.wa_timestamp || message.created_at || "")}
            </span>
            {isOutbound && (
              <span className="text-xs ml-1 text-blue-600">✓✓</span>
            )}
          </div>

          {/* Emoji Reactions */}
          <div className="px-3 pb-2">
            <EmojiReactions
              messageId={message.id.toString()}
              reactions={reactions.filter(r => r.count > 0)}
              onAddReaction={handleAddReaction}
              onRemoveReaction={handleRemoveReaction}
            />
          </div>
        </div>
      </MessageContextMenu>
    </div>
  );
}