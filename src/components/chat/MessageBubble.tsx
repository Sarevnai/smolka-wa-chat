import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { MediaMessage } from "./MediaMessage";
import { InteractiveMessage } from "./InteractiveMessage";
import { MessageStatusIndicator } from "./MessageStatusIndicator";
import { MessageOptionsDialog } from "./MessageOptionsDialog";
import { EmojiReactions } from "./EmojiReactions";
import { WhatsAppDeletedPlaceholder } from "./WhatsAppDeletedPlaceholder";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMessageActions } from "@/hooks/useMessageActions";

interface MessageBubbleProps {
  message: MessageRow;
  isLast?: boolean;
  onReply?: (message: MessageRow) => void;
  onForward?: (message: MessageRow) => void;
  onDeleteForMe?: (message: MessageRow) => void;
  onDeleteForEveryone?: (message: MessageRow) => void;
}

export function MessageBubble({ 
  message, 
  isLast, 
  onReply, 
  onForward, 
  onDeleteForMe, 
  onDeleteForEveryone 
}: MessageBubbleProps) {
  const [reactions, setReactions] = useState([
    { emoji: "👍", count: 0, users: [], hasUserReacted: false }
  ]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    handleReact, 
    handleStar, 
    handlePin, 
    handleCopy: handleCopyMessage, 
    handleReport, 
    handleSelectMessage 
  } = useMessageActions();
  const [deletionInfo, setDeletionInfo] = useState<{
    isDeleted: boolean;
    deletionType?: 'for_me' | 'for_everyone';
  }>({ isDeleted: false });

  // Check if message is deleted
  useEffect(() => {
    if (!user) return;

    // Check if message is deleted for everyone (global deletion)
    if (message.deleted_for_everyone) {
      setDeletionInfo({
        isDeleted: true,
        deletionType: 'for_everyone'
      });
      return;
    }

    // Check if message is deleted only for current user (local deletion)
    const checkIfDeleted = async () => {
      const { data } = await supabase
        .from('deleted_messages')
        .select('deletion_type')
        .eq('message_id', message.id)
        .eq('deleted_by', user.id)
        .eq('deletion_type', 'for_me')
        .maybeSingle();

      if (data) {
        setDeletionInfo({
          isDeleted: true,
          deletionType: 'for_me'
        });
      }
    };

    checkIfDeleted();
  }, [message.id, message.deleted_for_everyone, user]);

  const isOutbound = message.direction === "outbound";
  const hasMedia = message.media_type && message.media_type !== 'text';
  const isTemplate = message.is_template;

  // Handle deleted messages with WhatsApp-like behavior
  if (deletionInfo.isDeleted) {
    return (
      <WhatsAppDeletedPlaceholder
        message={message}
        deletionType={deletionInfo.deletionType!}
      />
    );
  }
  
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
      <MessageOptionsDialog
        message={message}
        onReply={onReply}
        onReact={handleReact}
        onStar={handleStar}
        onPin={handlePin}
        onForward={onForward}
        onCopy={handleCopyMessage}
        onReport={handleReport}
        onDeleteForMe={onDeleteForMe}
        onDeleteForEveryone={onDeleteForEveryone}
        onSelectMessage={handleSelectMessage}
      >
        <div className="relative group">
          {/* Message Options Button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10",
              "h-6 w-6 p-0 rounded-full bg-background/80 hover:bg-background shadow-sm",
              "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
            )}
            aria-label="Opções da mensagem"
          >
            <MoreVertical className="h-3 w-3" />
          </Button>
        
          <div className={cn(
            "max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[65%] relative animate-slide-in-from-left",
            hasMedia ? "rounded-xl overflow-hidden" : "",
            isOutbound 
              ? "bg-message-outbound text-message-text-outbound ml-auto shadow-sm rounded-xl rounded-br-md" 
              : "bg-message-inbound text-message-text-inbound mr-auto shadow-sm rounded-xl rounded-bl-md border border-gray-200/60"
          )}>
          
          {/* Reply Context Display */}
          {message.body && message.body.includes('_Respondendo a:') && (
            <div className={cn(
              "px-3 pt-2 border-l-4 border-primary/60 rounded-tl-lg",
              isOutbound ? "bg-white/20" : "bg-primary/5"
            )}>
              <div className="text-xs text-primary font-medium mb-1 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                Em resposta a:
              </div>
              <p className="text-xs text-muted-foreground italic line-clamp-2">
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
            "flex items-center justify-end px-3 pt-1 pb-2 gap-1.5 text-gray-500"
          )}>
            <span className="text-xs opacity-75">
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
        </div>
      </MessageOptionsDialog>
    </div>
  );
}