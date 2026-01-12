import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MessageSquare, Users, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { DepartmentMetrics } from "@/hooks/admin/useManagementStats";

interface DepartmentMetricCardProps {
  metrics: DepartmentMetrics;
}

const DEPARTMENT_LINKS: Record<string, string> = {
  locacao: '/pipeline/locacao',
  vendas: '/pipeline/vendas',
  administrativo: '/triage',
  marketing: '/marketing'
};

const DEPARTMENT_GRADIENTS: Record<string, string> = {
  locacao: 'from-blue-500/10 to-blue-600/5',
  vendas: 'from-green-500/10 to-green-600/5',
  administrativo: 'from-slate-500/10 to-slate-600/5',
  marketing: 'from-pink-500/10 to-pink-600/5'
};

const DEPARTMENT_BORDER: Record<string, string> = {
  locacao: 'border-l-blue-500',
  vendas: 'border-l-green-500',
  administrativo: 'border-l-slate-500',
  marketing: 'border-l-pink-500'
};

export function DepartmentMetricCard({ metrics }: DepartmentMetricCardProps) {
  const link = DEPARTMENT_LINKS[metrics.department] || '/';
  const gradient = DEPARTMENT_GRADIENTS[metrics.department] || '';
  const borderColor = DEPARTMENT_BORDER[metrics.department] || '';
  
  const topStages = Object.entries(metrics.pipelineStages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <Card className={cn(
      "border-l-4 hover:shadow-md transition-shadow",
      borderColor,
      "bg-gradient-to-br",
      gradient
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{metrics.icon}</span>
            <CardTitle className="text-lg font-semibold">
              {metrics.label}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to={link}>
              Ver <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{metrics.totalContacts}</p>
              <p className="text-xs text-muted-foreground">Contatos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{metrics.messagesToday}</p>
              <p className="text-xs text-muted-foreground">Msgs hoje</p>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{metrics.messagesWeek} msgs/semana</span>
          </div>
          <Badge variant="secondary">
            {metrics.activeConversations} ativas
          </Badge>
        </div>

        {/* Pipeline Stages Preview */}
        {topStages.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-2">Pipeline:</p>
            <div className="flex flex-wrap gap-1">
              {topStages.map(([stage, count]) => (
                <Badge key={stage} variant="outline" className="text-xs">
                  {stage}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
