import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHealthCheck, IntegrationStatus } from '@/hooks/useHealthCheck';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Loader2,
  Database,
  MessageCircle,
  Volume2,
  Building2,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

const integrationIcons: Record<string, React.ElementType> = {
  'Supabase': Database,
  'WhatsApp API': MessageCircle,
  'ElevenLabs': Volume2,
  'Vista CRM': Building2,
  'C2S CRM': Send
};

const StatusIcon = ({ status }: { status: IntegrationStatus['status'] }) => {
  switch (status) {
    case 'online':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'offline':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'checking':
      return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    default:
      return null;
  }
};

const StatusBadge = ({ status }: { status: 'healthy' | 'degraded' | 'critical' }) => {
  const variants = {
    healthy: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    degraded: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    critical: 'bg-destructive/10 text-destructive border-destructive/20'
  };

  const labels = {
    healthy: 'Saudável',
    degraded: 'Degradado',
    critical: 'Crítico'
  };

  return (
    <Badge variant="outline" className={cn('font-medium', variants[status])}>
      {labels[status]}
    </Badge>
  );
};

export function HealthCheckCard() {
  const { result, isChecking, checkHealth } = useHealthCheck();

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const onlineCount = result?.integrations.filter(i => i.status === 'online').length ?? 0;
  const totalCount = result?.integrations.length ?? 0;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Saúde do Sistema</CardTitle>
              <CardDescription className="text-xs">
                Status das integrações em tempo real
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {result && <StatusBadge status={result.overallStatus} />}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={checkHealth}
              disabled={isChecking}
              className="h-8 w-8"
            >
              <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isChecking && !result ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>Integrações ativas</span>
              <span className="font-medium text-foreground">{onlineCount}/{totalCount}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {result?.integrations.map((integration) => {
                const Icon = integrationIcons[integration.name] || Database;
                return (
                  <div
                    key={integration.name}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                      integration.status === 'online' && "border-emerald-500/20 bg-emerald-500/5",
                      integration.status === 'offline' && "border-destructive/20 bg-destructive/5",
                      integration.status === 'warning' && "border-amber-500/20 bg-amber-500/5"
                    )}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{integration.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {integration.message}
                      </p>
                    </div>
                    <StatusIcon status={integration.status} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
