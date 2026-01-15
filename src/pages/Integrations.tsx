import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, RefreshCw, Plus, TrendingUp } from "lucide-react";
import { useIntegrations } from "@/hooks/useIntegrations";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";

export default function Integrations() {
  const { integrations, loading, testConnection, disconnectIntegration, refreshStatus } = useIntegrations();

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const totalCount = integrations.length;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Integrações</h1>
              <p className="text-muted-foreground mt-2">
                Configure e gerencie todas as integrações do sistema em um só lugar
              </p>
            </div>
            <Button onClick={refreshStatus} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Status
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Integrações Ativas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{connectedCount}/{totalCount}</div>
                <p className="text-xs text-muted-foreground">
                  {((connectedCount / totalCount) * 100).toFixed(0)}% do total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {connectedCount === totalCount ? "🟢" : connectedCount > 0 ? "🟡" : "🔴"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {connectedCount === totalCount 
                    ? "Todas conectadas" 
                    : connectedCount > 0 
                      ? "Parcialmente conectado" 
                      : "Desconectado"
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Novas Integrações</CardTitle>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Em Breve</div>
                <p className="text-xs text-muted-foreground">
                  Solicite novas integrações
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onTestConnection={testConnection}
              onDisconnect={disconnectIntegration}
            />
          ))}
        </div>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Precisa de Ajuda?
            </CardTitle>
            <CardDescription>
              Nossa equipe está aqui para ajudar você a configurar suas integrações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1">
                Ver Documentação
              </Button>
              <Button variant="outline" className="flex-1">
                Contatar Suporte
              </Button>
              <Button variant="default" className="flex-1">
                Solicitar Nova Integração
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
