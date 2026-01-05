import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CampaignProgressBarProps {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  total: number;
  showLabels?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function CampaignProgressBar({
  sent,
  delivered,
  read,
  replied,
  failed,
  total,
  showLabels = false,
  size = "md",
  className,
}: CampaignProgressBarProps) {
  if (total === 0) {
    return (
      <div className={cn("w-full bg-muted rounded-full overflow-hidden", className)}>
        <div className={cn(
          "h-full bg-muted-foreground/20",
          size === "sm" && "h-1.5",
          size === "md" && "h-2.5",
          size === "lg" && "h-4"
        )} />
      </div>
    );
  }

  const segments = [
    { 
      value: replied, 
      color: "bg-purple-500 dark:bg-purple-400", 
      label: "Respondidas",
      percentage: (replied / total) * 100
    },
    { 
      value: read - replied, 
      color: "bg-green-500 dark:bg-green-400", 
      label: "Lidas",
      percentage: ((read - replied) / total) * 100
    },
    { 
      value: delivered - read, 
      color: "bg-blue-500 dark:bg-blue-400", 
      label: "Entregues",
      percentage: ((delivered - read) / total) * 100
    },
    { 
      value: sent - delivered, 
      color: "bg-gray-400 dark:bg-gray-500", 
      label: "Enviadas",
      percentage: ((sent - delivered) / total) * 100
    },
    { 
      value: failed, 
      color: "bg-red-500 dark:bg-red-400", 
      label: "Falhas",
      percentage: (failed / total) * 100
    },
  ].filter(s => s.value > 0);

  const heightClass = cn(
    size === "sm" && "h-1.5",
    size === "md" && "h-2.5",
    size === "lg" && "h-4"
  );

  return (
    <TooltipProvider>
      <div className={cn("space-y-2", className)}>
        <div className={cn("w-full bg-muted rounded-full overflow-hidden flex", heightClass)}>
          {segments.map((segment, index) => (
            <Tooltip key={segment.label}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    segment.color,
                    "transition-all duration-500 ease-out",
                    index === 0 && "rounded-l-full",
                    index === segments.length - 1 && "rounded-r-full"
                  )}
                  style={{ width: `${segment.percentage}%` }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{segment.label}</p>
                <p className="text-xs text-muted-foreground">
                  {segment.value} ({segment.percentage.toFixed(1)}%)
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {showLabels && (
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              <span className="text-muted-foreground">Respondidas: {replied}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Lidas: {read}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Entregues: {delivered}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-muted-foreground">Enviadas: {sent}</span>
            </div>
            {failed > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-muted-foreground">Falhas: {failed}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
