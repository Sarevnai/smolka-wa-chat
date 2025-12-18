import Layout from "@/components/Layout";
import { BreadcrumbNav } from "@/components/navigation/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useC2SMetrics } from "@/hooks/useC2SMetrics";
import { 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp, 
  RefreshCw,
  Download,
  MapPin,
  Home as HomeIcon
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function C2SDashboard() {
  const { data: metrics, isLoading, refetch, isRefetching } = useC2SMetrics();

  const handleExportCSV = () => {
    if (!metrics?.recentLeads) return;
    
    const headers = ["Nome", "Interesse", "Tipo", "Bairro", "Status", "Data"];
    const rows = metrics.recentLeads.map(lead => [
      lead.contact_name || lead.lead_data?.nome || "N/A",
      lead.lead_data?.interesse || "N/A",
      lead.lead_data?.tipo_imovel || "N/A",
      lead.lead_data?.bairro || "N/A",
      lead.sync_status,
      format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-c2s-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "synced":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Sincronizado</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 space-y-6">
        <BreadcrumbNav />
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard C2S</h1>
            <p className="text-muted-foreground">Métricas de leads enviados ao C2S</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportCSV}
              disabled={!metrics?.recentLeads?.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Enviados"
            value={metrics?.totalLeads}
            icon={Send}
            isLoading={isLoading}
            color="text-primary"
          />
          <StatsCard
            title="Sincronizados"
            value={metrics?.syncedLeads}
            icon={CheckCircle}
            isLoading={isLoading}
            color="text-green-500"
          />
          <StatsCard
            title="Com Erro"
            value={metrics?.errorLeads}
            icon={XCircle}
            isLoading={isLoading}
            color="text-destructive"
          />
          <StatsCard
            title="Taxa de Sucesso"
            value={metrics?.successRate !== undefined ? `${metrics.successRate}%` : undefined}
            icon={TrendingUp}
            isLoading={isLoading}
            color="text-chart-2"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Neighborhood */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Leads por Bairro
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : metrics?.leadsByNeighborhood?.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={metrics.leadsByNeighborhood} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs fill-muted-foreground" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={100} 
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leads by Property Type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <HomeIcon className="h-4 w-4" />
                Leads por Tipo de Imóvel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : metrics?.leadsByPropertyType?.length ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={metrics.leadsByPropertyType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metrics.leadsByPropertyType.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Timeline de Leads (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={metrics?.leadsByPeriod || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Recent Leads Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : metrics?.recentLeads?.length ? (
              <div className="space-y-2">
                {metrics.recentLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {lead.contact_name || lead.lead_data?.nome || "Nome não informado"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.lead_data?.interesse || `${lead.lead_data?.tipo_imovel || "Imóvel"} em ${lead.lead_data?.bairro || "N/A"}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(lead.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                      {getStatusBadge(lead.sync_status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lead enviado ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

interface StatsCardProps {
  title: string;
  value: number | string | undefined;
  icon: React.ElementType;
  isLoading: boolean;
  color: string;
}

function StatsCard({ title, value, icon: Icon, isLoading, color }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold">{value ?? 0}</p>
            )}
          </div>
          <div className={`p-3 rounded-full bg-muted ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
