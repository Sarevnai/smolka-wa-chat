import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className }: StatsCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-gold-md hover-scale border-gold-primary/20",
      "bg-surface-elevated shadow-elevation-2",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-600">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-gold-light">
          <Icon className="h-5 w-5 text-gold-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-neutral-900 truncate">{value}</div>
        {description && (
          <p className="text-sm text-neutral-500 mt-1 truncate">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <Badge 
              variant={trend.isPositive ? "success" : "error"}
              className="text-xs"
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </Badge>
            <span className="text-xs text-neutral-500">
              vs. semana passada
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}