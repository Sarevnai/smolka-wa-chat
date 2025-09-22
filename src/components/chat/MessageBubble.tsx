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
      "flex mb-1 animate-fade-in",
      isOutbound ? "justify-end" : "justify-start"
    )}>
      <MessageContextMenu
        message={message}
        onReply={handleReply}
        onCopy={handleCopy}
      >
        <div className={cn(
          "max-w-[45%] md:max-w-[65%] relative group animate-slide-in-from-left",
          hasMedia ? "rounded-xl overflow-hidden" : "",
          isOutbound 
            ? "bg-message-outbound text-message-text-outbound ml-auto shadow-sm rounded-xl rounded-br-md" 
            : "bg-message-inbound text-message-text-inbound mr-auto shadow-sm rounded-xl rounded-bl-md border border-gray-200/60"
        )}>
        
        {/* Reply Context Display */}
        {message.body && message.body.includes('_Respondendo a:') && (
          <div className="px-3 pt-2 border-l-4 border-blue-400 bg-blue-50/50 rounded-tl-lg">
            <div className="text-xs text-blue-600 font-medium mb-1">
              Em resposta a:
            </div>
            <p className="text-xs text-gray-600 italic">
              {message.body.split('\n\n')[0].replace('_Respondendo a: "', '').replace('"_', '')}
            </p>
          </div>
        )}
        
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
          <div>
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
          {(() => {
            const body = message.body?.trim();
            const caption = message.media_caption?.trim();
            const mediaType = message.media_type?.toLowerCase();
            const mime = message.media_mime_type?.toLowerCase();
            const forbidden = ['image','video','audio','voice','sticker','document','file','arquivo','imagem','vídeo','áudio'];
            const isRedundant =
              hasMedia &&
              body &&
              (body.toLowerCase() === mediaType ||
                (mime && body.toLowerCase() === mime) ||
                forbidden.includes(body.toLowerCase()));
            const shouldShow = !hasMedia || (!!body && body !== caption && !isRedundant);
            return shouldShow ? (
              <div className={cn(hasMedia ? "px-2 pb-1" : "px-3 py-1.5")}> 
                <p className={cn(
                  "text-sm leading-relaxed whitespace-pre-wrap break-words",
                  isOutbound ? "text-gray-900" : "text-gray-900"
                )}>
                  {/* Filter out reply context from displayed text */}
                  {message.body && message.body.includes('_Respondendo a:') 
                    ? message.body.split('\n\n').slice(1).join('\n\n') || "Mensagem sem conteúdo"
                    : message.body || "Mensagem sem conteúdo"}
                </p>
              </div>
            ) : null;
          })()}

        
          {/* Timestamp and Status */}
          <div className={cn(
            "flex items-center justify-end gap-1 px-3 pb-2 pt-1",
            hasMedia && "px-2",
            "text-gray-500"
          )}>
            <span className="text-xs opacity-80">
              {formatTime(message.wa_timestamp || message.created_at || "")}
            </span>
            {isOutbound && (
              <MessageStatusIndicator status={getMessageStatus()} />
            )}
          </div>

          {/* Emoji Reactions */}
          {reactions.filter(r => r.count > 0).length > 0 && (
            <div className="px-3 pb-2">
              <EmojiReactions
                messageId={message.id.toString()}
                reactions={reactions.filter(r => r.count > 0)}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
              />
            </div>
          )}
        </div>
      </MessageContextMenu>
    </div>
  );
}