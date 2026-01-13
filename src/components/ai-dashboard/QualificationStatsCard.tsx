import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LeadQualificationStats } from "@/types/lead-qualification";
import { 
  CheckCircle2, 
  XCircle, 
  Snowflake, 
  Send, 
  Clock,
  UserX,
  Users,
  TrendingUp
} from "lucide-react";

interface QualificationStatsCardProps {
  stats: LeadQualificationStats;
  isLoading: boolean;
}

export function QualificationStatsCard({ stats, isLoading }: QualificationStatsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Qualificação de Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2 w-20" />
                <div className="h-8 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    {
      label: "Em Qualificação",
      value: stats.pending + stats.qualifying,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      label: "Qualificados",
      value: stats.qualified,
      icon: CheckCircle2,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Enviados CRM",
      value: stats.sentToCrm,
      icon: Send,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Desqualificados",
      value: stats.disqualified,
      icon: XCircle,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      label: "Frios",
      value: stats.cold,
      icon: Snowflake,
      color: "text-slate-500",
      bgColor: "bg-slate-500/10"
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Qualificação de Leads
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Total: {stats.total} leads
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <div className={`inline-flex items-center justify-center h-10 w-10 rounded-full ${metric.bgColor} mb-2`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-xs text-muted-foreground">{metric.label}</div>
            </div>
          ))}
        </div>

        {/* Taxas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Taxa de Qualificação
              </span>
              <span className="font-medium">{stats.qualificationRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.qualificationRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <Send className="h-3 w-3 text-blue-500" />
                Taxa de Conversão (CRM)
              </span>
              <span className="font-medium">{stats.conversionRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.conversionRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-500" />
                Taxa de Desqualificação
              </span>
              <span className="font-medium">{stats.disqualificationRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.disqualificationRate} className="h-2" />
          </div>
        </div>

        {/* Motivos de desqualificação */}
        {stats.disqualified > 0 && (
          <div className="pt-2 border-t">
            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
              <UserX className="h-4 w-4" />
              Motivos de Desqualificação
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              {Object.entries(stats.disqualifiedByReason).map(([reason, count]) => (
                <div key={reason} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="capitalize text-muted-foreground">
                    {reason.replace('_', ' ')}
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Médias */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{stats.avgQualificationScore.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Score Médio</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{stats.avgQuestionsAsked.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Perguntas/Lead</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{stats.avgTimeToQualify.toFixed(0)} min</div>
            <div className="text-xs text-muted-foreground">Tempo Médio</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
