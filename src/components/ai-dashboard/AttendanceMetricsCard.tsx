import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { LeadStats } from "@/types/ai-behavior";

interface AttendanceMetricsCardProps {
  stats: LeadStats;
  isLoading: boolean;
}

export function AttendanceMetricsCard({ stats, isLoading }: AttendanceMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados gerais de atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-8 bg-muted rounded w-16" />
                <div className="h-2 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Dados gerais de atendimento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Topo do Funil */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.total}</span>
              <span className="text-sm text-muted-foreground">chegaram</span>
            </div>
            <Progress value={100} className="h-2 bg-primary/20" />
            <div className="flex justify-between text-sm">
              <span className="font-medium">Topo do funil</span>
              <span className="text-muted-foreground">100%</span>
            </div>
          </div>

          {/* Atendimentos */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.attended}</span>
              <span className="text-sm text-muted-foreground">atendidos</span>
            </div>
            <Progress 
              value={stats.attendedPercentage} 
              className="h-2"
            />
            <div className="flex justify-between text-sm">
              <span className="font-medium">Atendimentos</span>
              <span className="text-muted-foreground">{stats.attendedPercentage.toFixed(2)}%</span>
            </div>
          </div>

          {/* Encaminhados */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.sentToCrm}</span>
              <span className="text-sm text-muted-foreground">enviados CRM</span>
            </div>
            <Progress 
              value={stats.sentToCrmPercentage} 
              className="h-2"
            />
            <div className="flex justify-between text-sm">
              <span className="font-medium">Encaminhados</span>
              <span className="text-muted-foreground">{stats.sentToCrmPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
