import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useMarketingMetrics } from "@/hooks/useMarketingMetrics";
import { 
  Users, 
  UserPlus, 
  Target, 
  Heart, 
  Megaphone, 
  Send,
  TrendingUp,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Phone
} from "lucide-react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export default function MarketingDashboard() {
  const { data: metrics, isLoading, refetch } = useMarketingMetrics();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const contactTypeColors = [
    "hsl(330, 80%, 60%)", // Lead - Pink
    "hsl(280, 70%, 55%)", // Prospect - Purple
    "hsl(350, 75%, 55%)", // Engajado - Rose
    "hsl(300, 75%, 55%)", // Campanha - Fuchsia
  ];

  const getContactTypeBadge = (type: string | null) => {
    switch (type) {
      case "lead":
        return <Badge className="bg-pink-500/20 text-pink-600 border-pink-500/30">Lead</Badge>;
      case "prospect":
        return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500/30">Prospect</Badge>;
      case "engajado":
        return <Badge className="bg-rose-500/20 text-rose-600 border-rose-500/30">Engajado</Badge>;
      case "campanha":
        return <Badge className="bg-fuchsia-500/20 text-fuchsia-600 border-fuchsia-500/30">Campanha</Badge>;
      default:
        return <Badge variant="outline">Não definido</Badge>;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/10">
                <Megaphone className="h-8 w-8 text-pink-500" />
              </div>
              Dashboard de Marketing
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe métricas de leads, campanhas e engajamento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button 
              className="bg-pink-500 hover:bg-pink-600" 
              onClick={() => navigate("/pipeline/marketing")}
            >
              Ver Pipeline
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Contatos"
            value={metrics?.totalContacts || 0}
            description="Contatos no setor de Marketing"
            icon={Users}
            className="animate-fade-in border-pink-500/20"
          />
          <StatsCard
            title="Novos Leads"
            value={metrics?.leadCount || 0}
            description="Aguardando qualificação"
            icon={UserPlus}
            trend={{ value: 12, isPositive: true }}
            className="animate-fade-in [animation-delay:0.1s] border-pink-500/20"
          />
          <StatsCard
            title="Engajados"
            value={metrics?.engajadoCount || 0}
            description="Leads com interação ativa"
            icon={Heart}
            trend={{ value: 8, isPositive: true }}
            className="animate-fade-in [animation-delay:0.2s] border-pink-500/20"
          />
          <StatsCard
            title="Taxa de Conversão"
            value={`${(metrics?.conversionRate || 0).toFixed(1)}%`}
            description="Leads convertidos em engajados"
            icon={TrendingUp}
            className="animate-fade-in [animation-delay:0.3s] border-pink-500/20"
          />
        </div>

        {/* Campaign Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total de Campanhas"
            value={metrics?.totalCampaigns || 0}
            description="Campanhas criadas"
            icon={Megaphone}
            className="animate-fade-in [animation-delay:0.4s]"
          />
          <StatsCard
            title="Campanhas Ativas"
            value={metrics?.activeCampaigns || 0}
            description="Em envio ou agendadas"
            icon={Send}
            className="animate-fade-in [animation-delay:0.5s]"
          />
          <StatsCard
            title="Mensagens Hoje"
            value={metrics?.messagesSentToday || 0}
            description="Enviadas em campanhas"
            icon={BarChart3}
            className="animate-fade-in [animation-delay:0.6s]"
          />
          <StatsCard
            title="Taxa de Resposta"
            value={`${(metrics?.averageResponseRate || 0).toFixed(1)}%`}
            description="Média de respostas"
            icon={Target}
            className="animate-fade-in [animation-delay:0.7s]"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Types Pie Chart */}
          <Card className="animate-fade-in [animation-delay:0.8s]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Distribuição por Tipo
              </CardTitle>
              <CardDescription>
                Contatos do Marketing por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics?.contactsByType || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => 
                      percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(metrics?.contactsByType || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={contactTypeColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Leads Timeline */}
          <Card className="animate-fade-in [animation-delay:0.9s]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-pink-500" />
                Novos Contatos (7 dias)
              </CardTitle>
              <CardDescription>
                Leads e engajados por dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={metrics?.contactsTimeline || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="hsl(330, 80%, 60%)"
                    fill="hsl(330, 80%, 60%)"
                    fillOpacity={0.3}
                  />
                  <Area
                    type="monotone"
                    dataKey="engajados"
                    name="Engajados"
                    stroke="hsl(350, 75%, 55%)"
                    fill="hsl(350, 75%, 55%)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Campaigns */}
          <Card className="animate-fade-in [animation-delay:1s]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-pink-500" />
                Top Campanhas
              </CardTitle>
              <CardDescription>
                Melhores taxas de resposta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(metrics?.topCampaigns?.length || 0) > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={metrics?.topCampaigns || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={120}
                      className="text-xs fill-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Taxa de Resposta"]}
                    />
                    <Bar 
                      dataKey="response_rate" 
                      fill="hsl(330, 80%, 60%)" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[220px] text-muted-foreground">
                  <p>Nenhuma campanha enviada ainda</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Contacts */}
          <Card className="animate-fade-in [animation-delay:1.1s]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-pink-500" />
                Contatos Recentes
              </CardTitle>
              <CardDescription>
                Últimos leads adicionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[220px]">
                {(metrics?.recentContacts?.length || 0) > 0 ? (
                  <div className="space-y-3">
                    {metrics?.recentContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-pink-500/10">
                            <Phone className="h-4 w-4 text-pink-500" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {contact.name || contact.phone}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(contact.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </p>
                          </div>
                        </div>
                        {getContactTypeBadge(contact.contact_type)}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <p>Nenhum contato no Marketing ainda</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
