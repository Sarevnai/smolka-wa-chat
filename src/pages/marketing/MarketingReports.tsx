import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  BarChart3, ArrowLeft, TrendingUp, Users, Megaphone, 
  Download, Calendar, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useMarketingReports } from "@/hooks/useMarketingReports";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
  AreaChart, Area
} from "recharts";

const COLORS = ['#ec4899', '#8b5cf6', '#f97316', '#22c55e', '#3b82f6'];

export default function MarketingReports() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<number>(30);
  const { data: reports, isLoading, refetch } = useMarketingReports(period);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 p-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const funnelData = reports?.leads.conversionFunnel
    ? [
        { name: "Lead", value: reports.leads.conversionFunnel.lead },
        { name: "Prospect", value: reports.leads.conversionFunnel.prospect },
        { name: "Engajado", value: reports.leads.conversionFunnel.engajado },
        { name: "Campanha", value: reports.leads.conversionFunnel.campanha },
      ]
    : [];

  const campaignStatusData = reports?.campaigns.campaignsByStatus
    ? Object.entries(reports.campaigns.campaignsByStatus).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/marketing")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-8 w-8 text-pink-500" />
                Relatórios Marketing
              </h1>
              <p className="text-muted-foreground mt-1">
                Análise de performance e métricas
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Campaign Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-l-4 border-l-pink-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Enviadas</p>
              <p className="text-3xl font-bold">{reports?.campaigns.totalSent || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                mensagens no período
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Taxa Entrega</p>
              <p className="text-3xl font-bold">
                {(reports?.campaigns.deliveryRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {reports?.campaigns.totalDelivered || 0} entregues
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Taxa Resposta</p>
              <p className="text-3xl font-bold">
                {(reports?.campaigns.responseRate || 0).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {reports?.campaigns.totalResponded || 0} respostas
              </p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Melhor Horário</p>
              <p className="text-3xl font-bold">
                {reports?.campaigns.bestHour !== null ? `${reports.campaigns.bestHour}h` : "-"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                para enviar campanhas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Novos Leads Hoje</p>
                  <p className="text-3xl font-bold">{reports?.leads.newLeadsToday || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                  <p className="text-3xl font-bold">{reports?.leads.newLeadsThisWeek || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-3xl font-bold">{reports?.leads.newLeadsThisMonth || 0}</p>
                </div>
                <Megaphone className="h-8 w-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Daily Leads */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Novos Leads por Dia</CardTitle>
              <CardDescription>Evolução no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reports?.leads.dailyLeads || []}>
                    <XAxis dataKey="date" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Leads"
                      stroke="#ec4899"
                      fill="#ec4899"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              <CardDescription>Distribuição por estágio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {funnelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status das Campanhas</CardTitle>
              <CardDescription>Distribuição por status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={campaignStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {campaignStatusData.map((_, index) => (
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

          {/* Top Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contatos Mais Ativos</CardTitle>
              <CardDescription>Por número de mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {(reports?.engagement.topContacts || []).map((contact, index) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{contact.name || contact.phone}</p>
                          <p className="text-sm text-muted-foreground">{contact.phone}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{contact.messageCount} msgs</Badge>
                    </div>
                  ))}
                  {(!reports?.engagement.topContacts || reports.engagement.topContacts.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo de Engajamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-pink-500">
                  {reports?.engagement.activeContacts || 0}
                </p>
                <p className="text-sm text-muted-foreground">Contatos Ativos</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-purple-500">
                  {(reports?.engagement.averageMessagesPerContact || 0).toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground">Msgs/Contato (média)</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-3xl font-bold text-blue-500">{period}</p>
                <p className="text-sm text-muted-foreground">Dias analisados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
