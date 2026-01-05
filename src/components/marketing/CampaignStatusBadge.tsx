import { Clock, Calendar, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CampaignStatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  animated?: boolean;
}

const statusConfig: Record<string, { 
  icon: any; 
  label: string; 
  className: string;
  iconClassName?: string;
}> = {
  draft: { 
    icon: Clock, 
    label: "Rascunho", 
    className: "bg-muted text-muted-foreground border-border" 
  },
  scheduled: { 
    icon: Calendar, 
    label: "Agendada", 
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" 
  },
  sending: { 
    icon: Loader2, 
    label: "Enviando", 
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    iconClassName: "animate-spin"
  },
  sent: { 
    icon: CheckCircle, 
    label: "Enviada", 
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800" 
  },
  cancelled: { 
    icon: XCircle, 
    label: "Cancelada", 
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" 
  },
};

const sizeConfig = {
  sm: {
    badge: "text-xs px-2 py-0.5",
    icon: "h-3 w-3",
  },
  md: {
    badge: "text-sm px-2.5 py-1",
    icon: "h-3.5 w-3.5",
  },
  lg: {
    badge: "text-base px-3 py-1.5",
    icon: "h-4 w-4",
  },
};

export default function CampaignStatusBadge({ 
  status, 
  size = "md",
  showIcon = true,
  animated = true
}: CampaignStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium transition-all",
        config.className,
        sizes.badge,
        animated && status === "sending" && "animate-pulse"
      )}
    >
      {showIcon && (
        <Icon className={cn(sizes.icon, "mr-1.5", config.iconClassName)} />
      )}
      {config.label}
    </Badge>
  );
}
