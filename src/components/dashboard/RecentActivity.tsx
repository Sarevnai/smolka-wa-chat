import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityItem } from "@/hooks/useDashboardStats";
import { 
  MessageCircle, 
  Send, 
  Users, 
  Settings,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface RecentActivityProps {
  activities: ActivityItem[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'message':
      return MessageCircle;
    case 'campaign':
      return Send;
    case 'contact':
      return Users;
    case 'integration':
      return Settings;
    default:
      return Clock;
  }
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    case 'pending':
      return <Clock className="h-3 w-3 text-yellow-500" />;
    case 'error':
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    default:
      return null;
  }
};

const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'success':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
        <CardDescription>
          Últimas ações e eventos do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma atividade recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-all duration-200 hover-scale">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    activity.type === 'message' && "bg-blue-100 dark:bg-blue-900/20",
                    activity.type === 'campaign' && "bg-purple-100 dark:bg-purple-900/20",
                    activity.type === 'contact' && "bg-green-100 dark:bg-green-900/20",
                    activity.type === 'integration' && "bg-orange-100 dark:bg-orange-900/20"
                  )}>
                    <Icon className={cn(
                      "h-4 w-4",
                      activity.type === 'message' && "text-blue-600 dark:text-blue-400",
                      activity.type === 'campaign' && "text-purple-600 dark:text-purple-400",
                      activity.type === 'contact' && "text-green-600 dark:text-green-400",
                      activity.type === 'integration' && "text-orange-600 dark:text-orange-400"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.title}
                      </p>
                      <div className="flex items-center gap-2">
                        {activity.status && getStatusIcon(activity.status)}
                        {activity.status && (
                          <Badge variant={getStatusVariant(activity.status)} className="text-xs">
                            {activity.status === 'success' && 'Sucesso'}
                            {activity.status === 'pending' && 'Pendente'}
                            {activity.status === 'error' && 'Erro'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {activity.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { 
                        addSuffix: true,
                        locale: ptBR 
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}