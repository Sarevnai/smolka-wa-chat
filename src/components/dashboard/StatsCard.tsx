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
      "group transition-[transform,box-shadow] duration-200 hover:shadow-gold-md hover-scale border-gold-primary/20",
      "bg-surface-elevated shadow-elevation-2 animate-fade-in will-change-transform cursor-pointer",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-neutral-600 transition-colors duration-200 group-hover:text-gold-primary">
          {title}
        </CardTitle>
        <div className="p-2 rounded-lg bg-gold-light transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-gold-primary/20">
          <Icon className="h-5 w-5 text-gold-primary transition-transform duration-300 group-hover:scale-110" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-neutral-900 truncate transition-transform duration-200 group-hover:translate-x-1">{value}</div>
        {description && (
          <p className="text-sm text-neutral-500 mt-1 truncate">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-2 mt-3">
            <Badge 
              variant={trend.isPositive ? "success" : "error"}
              className="text-xs transition-transform duration-200 hover:scale-110 animate-pulse"
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </Badge>
            <span className="text-xs text-neutral-500 transition-colors duration-200 group-hover:text-neutral-700">
              vs. semana passada
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}