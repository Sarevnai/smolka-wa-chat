import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useReports } from "@/hooks/useReports";
import { useDepartment } from "@/contexts/DepartmentContext";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  MessageCircle, 
  Users, 
  Clock,
  Calendar,
  Download,
  Filter,
  Ticket,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  Target,
  Kanban
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Reports() {
  const { isAdmin, userDepartment } = useDepartment();
  const effectiveDepartment = isAdmin ? null : userDepartment;
  const { stats, recentActivity, messagesByPeriod, loading, refreshData } = useReports(effectiveDepartment);

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
                <p className="text-muted-foreground">Acompanhe métricas e performance</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // Define cards based on department
  const getStatsCards = () => {
    const baseCards = [
      {
        title: "Mensagens Hoje",
        value: stats?.todayMessages.toString() || "0",
        change: "+12%",
        trend: "up",
        icon: MessageCircle,
        color: "text-primary"
      },
      {
        title: "Conversas Ativas",
        value: stats?.activeConversations.toString() || "0",
        change: "+5%",
        trend: "up", 
        icon: Users,
        color: "text-primary"
      },
      {
        title: "Tempo Médio Resposta",
        value: stats?.avgResponseTime || "0min",
        change: "-8%",
        trend: "down",
        icon: Clock,
        color: "text-green-600"
      },
      {
        title: "Taxa de Resposta",
        value: stats?.responseRate || "0%",
        change: "+2%",
        trend: "up",
        icon: TrendingUp,
        color: "text-primary"
      }
    ];

    // Cards específicos por departamento
    if (effectiveDepartment === 'administrativo') {
      return [
        ...baseCards,
        {
          title: "Triagens Pendentes",
          value: stats?.triagePending?.toString() || "0",
          change: "-5%",
          trend: "down",
          icon: AlertTriangle,
          color: "text-orange-600"
        },
        {
          title: "Triagens Realizadas",
          value: stats?.triageCompleted?.toString() || "0",
          change: "+15%",
          trend: "up",
          icon: CheckCircle,
          color: "text-green-600"
        },
        {
          title: "Tickets Ativos",
          value: stats?.activeTickets?.toString() || "0",
          change: "-3%",
          trend: "down",
          icon: Ticket,
          color: "text-orange-600"
        }
      ];
    } else if (effectiveDepartment === 'locacao' || effectiveDepartment === 'vendas') {
      return [
        ...baseCards,
        {
          title: "Leads Qualificados",
          value: stats?.qualifiedLeads?.toString() || "0",
          change: "+10%",
          trend: "up",
          icon: Target,
          color: "text-green-600"
        },
        {
          title: "No Pipeline",
          value: stats?.pipelineCount?.toString() || "0",
          change: "+8%",
          trend: "up",
          icon: Kanban,
          color: "text-primary"
        },
        {
          title: "Total Contatos",
          value: stats?.totalContacts?.toString() || "0",
          change: "+15%",
          trend: "up",
          icon: Users,
          color: "text-primary"
        }
      ];
    }

    // Dashboard geral (admin)
    return [
      ...baseCards,
      {
        title: "Total Contatos",
        value: stats?.totalContacts?.toString() || "0",
        change: "+15%",
        trend: "up",
        icon: Users,
        color: "text-primary"
      },
      {
        title: "Tickets Ativos",
        value: stats?.activeTickets?.toString() || "0",
        change: "-3%",
        trend: "down",
        icon: Ticket,
        color: "text-orange-600"
      },
      {
        title: "Tickets Concluídos",
        value: stats?.completedTickets?.toString() || "0",
        change: "+8%",
        trend: "up",
        icon: CheckCircle,
        color: "text-green-600"
      }
    ];
  };

  const statsCards = getStatsCards();
  const departmentLabel = effectiveDepartment 
    ? effectiveDepartment.charAt(0).toUpperCase() + effectiveDepartment.slice(1)
    : 'Geral';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Relatórios {!isAdmin && `- ${departmentLabel}`}
                </h1>
                <p className="text-muted-foreground">
                  {isAdmin 
                    ? 'Dados consolidados de todos os setores' 
                    : `Dados do setor de ${departmentLabel.toLowerCase()}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={refreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{stat.title}</p>
                      <p className="text-xl font-bold text-foreground">{stat.value}</p>
                      <div className="flex items-center mt-1">
                        {stat.trend === "up" ? (
                          <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-green-600 mr-1" />
                        )}
                        <span className="text-xs text-green-600 font-medium">
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className="p-2 rounded-full bg-accent">
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Seção específica para Administrativo */}
        {effectiveDepartment === 'administrativo' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Resumo de Triagem</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 text-center">
                  <p className="text-2xl font-bold text-orange-600">{stats?.triagePending || 0}</p>
                  <p className="text-sm text-muted-foreground">Aguardando Triagem</p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats?.triageCompleted || 0}</p>
                  <p className="text-sm text-muted-foreground">Triagens Realizadas</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats?.activeTickets || 0}</p>
                  <p className="text-sm text-muted-foreground">Tickets Ativos</p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/30 text-center">
                  <p className="text-2xl font-bold text-slate-600">{stats?.completedTickets || 0}</p>
                  <p className="text-sm text-muted-foreground">Tickets Concluídos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Mensagens por Período (7 dias)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={messagesByPeriod}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="inbound" fill="hsl(var(--primary))" name="Recebidas" />
                    <Bar dataKey="outbound" fill="hsl(var(--secondary))" name="Enviadas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Response Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Tempo de Resposta</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Gráfico de tempo de resposta</p>
                  <p className="text-sm">Em desenvolvimento...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Atividade Recente</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-accent/30">
                      <div className="text-sm font-medium text-muted-foreground min-w-[60px]">
                        {activity.time}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {activity.action}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.contact}
                        </p>
                      </div>
                      <Badge 
                        variant={activity.status === "inbound" ? "default" : 
                                activity.status === "outbound" ? "secondary" : 
                                activity.status === "completed" ? "outline" : "outline"}
                        className="text-xs"
                      >
                        {activity.status === "inbound" ? "Recebida" :
                         activity.status === "outbound" ? "Enviada" : 
                         activity.status === "completed" ? "Concluído" : "Nova"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma atividade recente encontrada</p>
                  </div>
                )}
              </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
