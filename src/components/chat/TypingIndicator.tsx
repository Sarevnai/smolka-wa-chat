import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex justify-start mb-1", className)}>
      <div className="bg-white border border-border/20 rounded-lg rounded-bl-sm shadow-sm px-4 py-3 max-w-[75%] mr-12">
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">digitando</span>
          <div className="flex gap-0.5 ml-1">
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  );
}