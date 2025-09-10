import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  MessageCircle, 
  Users, 
  Clock,
  Calendar,
  Download,
  Filter
} from "lucide-react";

export default function Reports() {
  // Mock data para demonstração
  const stats = [
    {
      title: "Mensagens Hoje",
      value: "147",
      change: "+12%",
      trend: "up",
      icon: MessageCircle,
      color: "text-primary"
    },
    {
      title: "Conversas Ativas",
      value: "23",
      change: "+5%",
      trend: "up", 
      icon: Users,
      color: "text-primary"
    },
    {
      title: "Tempo Médio Resposta",
      value: "2.5min",
      change: "-8%",
      trend: "down",
      icon: Clock,
      color: "text-green-600"
    },
    {
      title: "Taxa de Resposta",
      value: "94%",
      change: "+2%",
      trend: "up",
      icon: TrendingUp,
      color: "text-primary"
    }
  ];

  const recentActivity = [
    {
      time: "14:30",
      action: "Nova mensagem recebida",
      contact: "João Silva",
      status: "inbound"
    },
    {
      time: "14:25", 
      action: "Mensagem enviada",
      contact: "Maria Santos",
      status: "outbound"
    },
    {
      time: "14:20",
      action: "Conversa iniciada",
      contact: "Pedro Costa",
      status: "new"
    },
    {
      time: "14:15",
      action: "Mensagem respondida",
      contact: "Ana Lima",
      status: "outbound"
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
                <p className="text-muted-foreground">Acompanhe métricas e performance</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <div className="flex items-center mt-1">
                        {stat.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-600 mr-1" />
                        )}
                        <span className="text-sm text-green-600 font-medium">
                          {stat.change}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-full bg-accent">
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Mensagens por Período</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Gráfico de mensagens por período</p>
                  <p className="text-sm">Em desenvolvimento...</p>
                </div>
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
              {recentActivity.map((activity, index) => (
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
                            activity.status === "outbound" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {activity.status === "inbound" ? "Recebida" :
                     activity.status === "outbound" ? "Enviada" : "Nova"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}