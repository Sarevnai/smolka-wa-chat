import { useState } from "react";
import { Plus, Smile } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Reaction {
  emoji: string;
  count: number;
  users: string[];
  hasUserReacted: boolean;
}

interface EmojiReactionsProps {
  messageId: string;
  reactions: Reaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  className?: string;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function EmojiReactions({ 
  messageId, 
  reactions, 
  onAddReaction, 
  onRemoveReaction, 
  className 
}: EmojiReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);

  const handleReactionClick = (emoji: string, hasUserReacted: boolean) => {
    if (hasUserReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    if (existingReaction?.hasUserReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
    setShowPicker(false);
  };

  return (
    <div className={cn("flex items-center gap-1 mt-1", className)}>
      {/* Existing reactions */}
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.hasUserReacted)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
            "border transition-colors duration-200",
            reaction.hasUserReacted
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background border-border hover:bg-muted"
          )}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full bg-background/50 hover:bg-background border border-border/50"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" side="top" align="start">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Smile className="h-4 w-4" />
              Reações rápidas
            </div>
            <div className="grid grid-cols-6 gap-1">
              {QUICK_REACTIONS.map((emoji) => {
                const existingReaction = reactions.find(r => r.emoji === emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => handleQuickReaction(emoji)}
                    className={cn(
                      "p-2 rounded-md text-lg hover:bg-muted transition-colors",
                      existingReaction?.hasUserReacted && "bg-primary/20"
                    )}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
