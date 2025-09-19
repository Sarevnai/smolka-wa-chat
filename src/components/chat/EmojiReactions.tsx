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
  const [showAllReactions, setShowAllReactions] = useState(false);

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
    setShowAllReactions(false);
  };

  // Show up to 3 reactions, then "+X more" 
  const visibleReactions = reactions.slice(0, 3);
  const hiddenCount = reactions.length - 3;

  if (reactions.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-1 mt-1", className)}>
      {/* Visible reactions (up to 3) */}
      {visibleReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji, reaction.hasUserReacted)}
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs",
            "border transition-all duration-200 hover:scale-105",
            reaction.hasUserReacted
              ? "bg-blue-500 text-white border-blue-500 shadow-sm"
              : "bg-white border-gray-300 hover:bg-gray-50 shadow-sm"
          )}
        >
          <span className="text-sm">{reaction.emoji}</span>
          <span className="font-medium">{reaction.count}</span>
        </button>
      ))}

      {/* "+X more" button if there are hidden reactions */}
      {hiddenCount > 0 && (
        <Popover open={showAllReactions} onOpenChange={setShowAllReactions}>
          <PopoverTrigger asChild>
            <button
              className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 border border-gray-300 hover:bg-gray-150 transition-colors"
            >
              <span className="text-gray-600 font-medium">+{hiddenCount}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" side="top" align="start">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground border-b pb-2">
                <Smile className="h-4 w-4" />
                Todas as reações
              </div>
              <div className="grid grid-cols-4 gap-2">
                {reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReactionClick(reaction.emoji, reaction.hasUserReacted)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg transition-colors text-left",
                      reaction.hasUserReacted
                        ? "bg-blue-500 text-white"
                        : "hover:bg-gray-100"
                    )}
                  >
                    <span className="text-lg">{reaction.emoji}</span>
                    <span className="text-sm font-medium">{reaction.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Add new reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-colors"
          >
            <Plus className="h-3 w-3 text-gray-500" />
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
                      "p-2 rounded-md text-lg hover:bg-gray-100 transition-colors",
                      existingReaction?.hasUserReacted && "bg-blue-100"
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