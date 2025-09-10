import { Badge } from "@/components/ui/badge";
import { SparklesIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AutoNameDetectionBadgeProps {
  name: string;
  className?: string;
}

export function AutoNameDetectionBadge({ name, className }: AutoNameDetectionBadgeProps) {
  // Simple heuristic to detect if name was auto-generated vs manually entered
  const isAutoDetected = name && 
    name.length > 1 && 
    !name.includes('@') && 
    !name.match(/^\d+$/) &&
    !name.startsWith('+');

  if (!isAutoDetected) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={`text-xs gap-1 ${className}`}>
            <SparklesIcon className="h-3 w-3" />
            Auto
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Nome detectado automaticamente das mensagens</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}