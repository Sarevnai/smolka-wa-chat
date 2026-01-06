import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MousePointerClick, Reply } from "lucide-react";

interface ButtonReplyBubbleProps {
  buttonText: string;
  buttonPayload?: string;
  contextMessageId?: string;
  isOutbound: boolean;
}

export function ButtonReplyBubble({ 
  buttonText, 
  buttonPayload,
  contextMessageId,
  isOutbound 
}: ButtonReplyBubbleProps) {
  return (
    <div className="px-3 pt-3 space-y-2">
      {/* Button Reply Badge */}
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs gap-1.5",
          "bg-primary/10 border-primary/30 text-primary"
        )}
      >
        <MousePointerClick className="w-3 h-3" />
        Resposta de botão
      </Badge>

      {/* Visual Button Representation */}
      <div 
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
          "border-2 border-primary/50 bg-primary/10",
          "font-medium text-sm text-primary"
        )}
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        {buttonText}
      </div>

      {/* Context Reference */}
      {contextMessageId && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Reply className="w-3 h-3" />
          <span>Em resposta ao template</span>
        </div>
      )}
    </div>
  );
}
