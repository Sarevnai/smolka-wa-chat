import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend 
} from "recharts";
import { 
  RefreshCw, MessageSquare, Users, MessageCircle, 
  Megaphone, Ticket, UserCog, Briefcase, TrendingUp
} from "lucide-react";
import { useManagementStats } from "@/hooks/admin/useManagementStats";
import { DepartmentMetricCard } from "@/components/admin/DepartmentMetricCard";
import { PortalLeadsCard } from "@/components/admin/PortalLeadsCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: number;
  loading?: boolean;
}

function StatCard({ title, value, icon, description, trend, loading }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</div>
          {trend !== undefined && (
            <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
              {trend >= 0 ? '+' : ''}{trend}%
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ManagementDashboard() {
  const { data: stats, isLoading, refetch, isFetching, dataUpdatedAt } = useManagementStats();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const lastUpdate = dataUpdatedAt 
    ? format(new Date(dataUpdatedAt), "HH:mm", { locale: ptBR })
    : '--:--';

  // Prepare chart data for department comparison
  const departmentChartData = stats?.departments.map(d => ({
    name: d.label,
    contatos: d.totalContacts,
    conversas: d.activeConversations,
    mensagens: d.messagesToday
  })) || [];

  return (
    <Layout>
      <div className="flex-1 space-y-6 p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestão</h1>
                <p className="text-muted-foreground">
                  Visão consolidada de todos os setores
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Atualizado às {lastUpdate}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching || isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(isFetching || isRefreshing) ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard
            title="Total de Mensagens"
            value={stats?.totalMessages || 0}
            icon={<MessageSquare className="h-4 w-4" />}
            description="Todas as mensagens"
            loading={isLoading}
          />
          <StatCard
            title="Contatos"
            value={stats?.totalContacts || 0}
            icon={<Users className="h-4 w-4" />}
            description="Base total"
            loading={isLoading}
          />
          <StatCard
            title="Conversas Ativas"
            value={stats?.totalConversations || 0}
            icon={<MessageCircle className="h-4 w-4" />}
            description="Em andamento"
            loading={isLoading}
          />
          <StatCard
            title="Campanhas Ativas"
            value={stats?.activeCampaigns || 0}
            icon={<Megaphone className="h-4 w-4" />}
            description="Marketing"
            loading={isLoading}
          />
          <StatCard
            title="Tickets Abertos"
            value={stats?.openTickets || 0}
            icon={<Ticket className="h-4 w-4" />}
            description="Pendentes"
            loading={isLoading}
          />
          <StatCard
            title="Usuários"
            value={stats?.totalUsers || 0}
            icon={<UserCog className="h-4 w-4" />}
            description="Atendentes"
            loading={isLoading}
          />
        </div>

        {/* Department Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comparativo por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={departmentChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="contatos" name="Contatos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="conversas" name="Conversas Ativas" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mensagens" name="Msgs Hoje" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Department Cards Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Detalhes por Setor</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              stats?.departments.map((dept) => (
                <DepartmentMetricCard key={dept.department} metrics={dept} />
              ))
            )}
          </div>
        </div>

        {/* Portal Leads and Trends Row */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Portal Leads */}
          {isLoading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : (
            <PortalLeadsCard stats={stats?.portalLeads || { total: 0, byPortal: {}, todayCount: 0, weekCount: 0 }} />
          )}

          {/* Trends Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendência de Mensagens (7 dias)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : stats?.trends && stats.trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={stats.trends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="locacao" name="Locação" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="administrativo" name="Administrativo" stroke="#64748b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="marketing" name="Marketing" stroke="#ec4899" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p>Sem dados de tendência disponíveis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
