import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bug, Clock, RefreshCw, TrendingUp } from "lucide-react";
import { useAIErrorDashboard } from "@/hooks/useAIErrorDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const AGENT_LABELS: Record<string, string> = {
  'whatsapp-webhook': 'WhatsApp Webhook',
  'ai-vendas': 'Aimee Vendas',
  'ai-virtual-agent': 'Agente Virtual',
  'ai-marketing-agent': 'Marketing',
  'make-webhook': 'Make Webhook',
  'ai-reengagement': 'Reengajamento',
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  'unhandled_exception': 'destructive',
  'llm_error': 'destructive',
  'whatsapp_send_error': 'secondary',
  'timeout': 'secondary',
  'validation_error': 'outline',
};

export default function AIErrorDashboard() {
  const { data, isLoading } = useAIErrorDashboard();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Bug className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Últimas 24h</p>
                <p className="text-2xl font-bold">{data.errors_24h}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                <p className="text-2xl font-bold">{data.errors_7d}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total (30 dias)</p>
                <p className="text-2xl font-bold">{data.total_errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors by Agent + Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Erros por Agente</CardTitle>
          </CardHeader>
          <CardContent>
            {data.by_agent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum erro registrado ✅</p>
            ) : (
              <div className="space-y-3">
                {data.by_agent.map(a => (
                  <div key={a.agent_name} className="flex items-center justify-between">
                    <span className="text-sm">{AGENT_LABELS[a.agent_name] || a.agent_name}</span>
                    <Badge variant="secondary">{a.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Erros por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {data.by_type.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum erro registrado ✅</p>
            ) : (
              <div className="space-y-3">
                {data.by_type.map(t => (
                  <div key={t.error_type} className="flex items-center justify-between">
                    <span className="text-sm font-mono">{t.error_type}</span>
                    <Badge variant={(ERROR_TYPE_COLORS[t.error_type] as any) || 'outline'}>{t.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recurring Errors */}
      {data.recurring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Erros Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recurring.map((r, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">{AGENT_LABELS[r.agent_name] || r.agent_name}</Badge>
                    <span className="text-sm font-bold text-destructive">{r.count}x</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{r.error_message}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Último: {formatDistanceToNow(new Date(r.last_seen), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Erros Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum erro nos últimos 30 dias 🎉</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.recent_errors.map(e => (
                <div key={e.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {AGENT_LABELS[e.agent_name] || e.agent_name}
                      </Badge>
                      <Badge variant={(ERROR_TYPE_COLORS[e.error_type] as any) || 'secondary'} className="text-xs">
                        {e.error_type}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(e.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{e.error_message}</p>
                  {e.phone_number && (
                    <p className="text-xs text-muted-foreground">📱 {e.phone_number}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
