import { useNavigate } from "react-router-dom";
import { 
  Users, Megaphone, TrendingUp, Target, BarChart3, 
  Plus, RefreshCw, Send, Bot, Tags
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import Layout from "@/components/Layout";
import { useMarketingMetrics } from "@/hooks/useMarketingMetrics";
import { useQueryClient } from "@tanstack/react-query";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Legend
} from "recharts";

const COLORS = ['#ec4899', '#8b5cf6', '#f97316', '#22c55e'];

export default function MarketingDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: metrics, isLoading, refetch } = useMarketingMetrics();

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["marketing-metrics"] });
  };

  const getContactTypeBadge = (type: string | null) => {
    const colors: Record<string, string> = {
      lead: "bg-pink-100 text-pink-800 border-pink-200",
      prospect: "bg-purple-100 text-purple-800 border-purple-200",
      engajado: "bg-orange-100 text-orange-800 border-orange-200",
      campanha: "bg-green-100 text-green-800 border-green-200",
    };
    return (
      <Badge variant="outline" className={colors[type || ""] || "bg-gray-100"}>
        {type || "N/A"}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-pink-500" />
              Dashboard Marketing
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão geral do setor de marketing
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Button onClick={() => navigate("/marketing/campaigns")} className="bg-pink-500 hover:bg-pink-600">
            <Megaphone className="h-4 w-4 mr-2" />
            Campanhas
          </Button>
          <Button onClick={() => navigate("/marketing/contacts")} variant="outline">
            <Users className="h-4 w-4 mr-2" />
            Contatos
          </Button>
          <Button onClick={() => navigate("/marketing/reports")} variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
          <Button onClick={() => navigate("/pipeline/marketing")} variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Pipeline
          </Button>
          <Button onClick={() => navigate("/marketing/ai-config")} variant="outline">
            <Bot className="h-4 w-4 mr-2" />
            Agente IA
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-pink-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Contatos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.totalContacts || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.leadCount || 0} leads ativos
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Novos Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.leadCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.prospectCount || 0} prospects
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Engajados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.engajadoCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Taxa de conversão
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(metrics?.conversionRate || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Lead → Engajado
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Campanhas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.totalCampaigns || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.activeCampaigns || 0} ativas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mensagens Hoje
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.messagesSentToday || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics?.messagesSentThisMonth || 0} este mês
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Resposta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {(metrics?.averageResponseRate || 0).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Média das campanhas
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contatos Campanha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{metrics?.campanhaCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando follow-up
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Contact Types Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Contatos</CardTitle>
              <CardDescription>Por tipo de contato</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics?.contactsByType || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {(metrics?.contactsByType || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Novos Contatos</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics?.contactsTimeline || []}>
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="leads"
                      name="Leads"
                      stroke="#ec4899"
                      fill="#ec4899"
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="engajados"
                      name="Engajados"
                      stroke="#f97316"
                      fill="#f97316"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Campanhas</CardTitle>
              <CardDescription>Por taxa de resposta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={metrics?.topCampaigns?.slice(0, 5) || []}
                  >
                    <XAxis type="number" domain={[0, 100]} unit="%" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      fontSize={11}
                      tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + "..." : value}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Taxa de Resposta"]}
                    />
                    <Bar
                      dataKey="response_rate"
                      fill="#8b5cf6"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Contacts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Contatos Recentes</CardTitle>
                <CardDescription>Últimas adições</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/marketing/contacts")}
              >
                Ver Todos
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(metrics?.recentContacts || []).map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {contact.name || contact.phone}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {contact.phone}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getContactTypeBadge(contact.contact_type)}
                      </div>
                    </div>
                  ))}
                  {(!metrics?.recentContacts || metrics.recentContacts.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum contato recente
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
