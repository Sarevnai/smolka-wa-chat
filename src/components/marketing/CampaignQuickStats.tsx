import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignQuickStatsProps {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  className?: string;
  compact?: boolean;
}

export default function CampaignQuickStats({
  sent,
  delivered,
  read,
  replied,
  failed,
  className,
  compact = false,
}: CampaignQuickStatsProps) {
  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0";
  const readRate = delivered > 0 ? ((read / delivered) * 100).toFixed(1) : "0";
  const responseRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0";

  const getRateIcon = (rate: number) => {
    if (rate >= 80) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (rate >= 50) return <Minus className="h-3 w-3 text-amber-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-xs", className)}>
        <span className="text-muted-foreground">
          {sent} enviadas
        </span>
        <span className="text-blue-600 dark:text-blue-400">
          {deliveryRate}% entrega
        </span>
        <span className="text-purple-600 dark:text-purple-400">
          {responseRate}% resposta
        </span>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-4 gap-4", className)}>
      <div className="text-center">
        <p className="text-2xl font-bold text-foreground">{sent}</p>
        <p className="text-xs text-muted-foreground">Enviadas</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{deliveryRate}%</p>
          {getRateIcon(parseFloat(deliveryRate))}
        </div>
        <p className="text-xs text-muted-foreground">Entrega</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{readRate}%</p>
          {getRateIcon(parseFloat(readRate))}
        </div>
        <p className="text-xs text-muted-foreground">Leitura</p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{responseRate}%</p>
          {getRateIcon(parseFloat(responseRate))}
        </div>
        <p className="text-xs text-muted-foreground">Resposta</p>
      </div>
    </div>
  );
}
