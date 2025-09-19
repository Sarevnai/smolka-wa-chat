import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Unplug,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Integration } from "@/hooks/useIntegrations";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface IntegrationCardProps {
  integration: Integration;
  onTestConnection: (id: string) => Promise<boolean>;
  onDisconnect: (id: string) => Promise<void>;
}

const getStatusIcon = (status: string, isLoading?: boolean) => {
  if (isLoading) {
    return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
  }
  
  switch (status) {
    case 'connected':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'disconnected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected':
      return 'Conectado';
    case 'disconnected':
      return 'Desconectado';
    case 'pending':
      return 'Testando...';
    default:
      return 'Desconhecido';
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'connected':
      return 'default';
    case 'disconnected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function IntegrationCard({ integration, onTestConnection, onDisconnect }: IntegrationCardProps) {
  const isConnected = integration.status === 'connected';
  const isPending = integration.status === 'pending';
  const isDisconnected = integration.status === 'disconnected';

  const handleTestConnection = async () => {
    await onTestConnection(integration.id);
  };

  const handleDisconnect = async () => {
    await onDisconnect(integration.id);
  };

  return (
    <Card className={cn(
      "relative h-full flex flex-col transition-all duration-200 hover:shadow-lg",
      isConnected && "ring-2 ring-green-500/20 border-green-500/30",
      isDisconnected && "border-red-500/30"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-lg",
              isConnected && "bg-green-500/10",
              isDisconnected && "bg-red-500/10",
              isPending && "bg-yellow-500/10"
            )}>
              <Settings className={cn(
                "h-6 w-6",
                isConnected && "text-green-500",
                isDisconnected && "text-red-500", 
                isPending && "text-yellow-500"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon(integration.status, isPending)}
                <Badge variant={getStatusVariant(integration.status)} className="text-xs">
                  {getStatusText(integration.status)}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <CardDescription className="mt-3">
          {integration.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div>
          <h4 className="text-sm font-medium mb-3 text-foreground">Recursos:</h4>
          <ul className="space-y-2">
            {integration.features.map((feature, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-center">
                <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
          
          {/* Status Details */}
          {isConnected && integration.lastSync && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="text-xs text-green-700 dark:text-green-300">
                Última sincronização: {formatDistanceToNow(new Date(integration.lastSync), { 
                  addSuffix: true,
                  locale: ptBR 
                })}
              </div>
            </div>
          )}
          
          {integration.errorMessage && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
              <div className="text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                {integration.errorMessage}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <div className="flex gap-2 w-full">
          <Button asChild className="flex-1" variant="outline">
            <Link to={integration.configPath}>
              <Settings className="h-4 w-4 mr-2" />
              Configurar
            </Link>
          </Button>
          
          {isConnected && (
            <>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={handleTestConnection}
                disabled={isPending}
              >
                <RefreshCw className={cn("h-4 w-4", isPending && "animate-spin")} />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700">
                    <Unplug className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar {integration.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá desconectar a integração com {integration.name}. 
                      Você precisará configurá-la novamente para restaurar a funcionalidade.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDisconnect}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          
          {isDisconnected && (
            <Button 
              size="sm" 
              variant="default"
              onClick={handleTestConnection}
              disabled={isPending}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
              Testar Conexão
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}