import { useState } from "react";
import { 
  Megaphone, Plus, Search, BarChart3, Send, CheckCircle, 
  MessageCircle, TrendingUp, Filter, LayoutDashboard, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import Layout from "@/components/Layout";
import { useCampaigns, useCampaignStats } from "@/hooks/useCampaigns";
import { useCampaignAnalytics } from "@/hooks/useCampaignAnalytics";
import { Campaign } from "@/types/campaign";
import CampaignStatusBadge from "@/components/marketing/CampaignStatusBadge";
import CampaignProgressBar from "@/components/marketing/CampaignProgressBar";
import CampaignDetailModal from "@/components/marketing/CampaignDetailModal";
import CampaignTimelineChart from "@/components/marketing/CampaignTimelineChart";
import CampaignCreator from "@/components/marketing/CampaignCreator";
import SyncTemplatesButton from "@/components/campaigns/SyncTemplatesButton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "draft" | "scheduled" | "sending" | "sent" | "cancelled";

const statusColors: Record<string, string> = {
  draft: "#9ca3af",
  scheduled: "#3b82f6",
  sending: "#f59e0b",
  sent: "#22c55e",
  cancelled: "#ef4444",
};

export default function MarketingCampaigns() {
  const [mainTab, setMainTab] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [listTab, setListTab] = useState("all");
  const [analyticsPeriod, setAnalyticsPeriod] = useState(7);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const { data: campaigns = [], isLoading, refetch } = useCampaigns();
  const { data: stats } = useCampaignStats();
  const { data: analytics } = useCampaignAnalytics(analyticsPeriod);

  // Filter campaigns based on tab and search
  const getFilteredCampaigns = () => {
    let filtered = campaigns;

    if (listTab !== "all") {
      if (listTab === "active") {
        filtered = filtered.filter(c => c.status === "scheduled" || c.status === "sending");
      } else {
        filtered = filtered.filter(c => c.status === listTab);
      }
    }

    return filtered.filter((campaign) => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  };

  const filteredCampaigns = getFilteredCampaigns();

  // Prepare pie chart data
  const pieData = analytics ? Object.entries(analytics.campaignsByStatus)
    .filter(([, value]) => value > 0)
    .map(([status, value]) => ({
      name: status === "draft" ? "Rascunho" :
            status === "scheduled" ? "Agendada" :
            status === "sending" ? "Enviando" :
            status === "sent" ? "Enviada" : "Cancelada",
      value,
      color: statusColors[status],
    })) : [];

  const getCampaignMetrics = (campaign: Campaign) => {
    const sent = campaign.sent_count || 0;
    const delivered = campaign.delivered_count || 0;
    const failed = campaign.failed_count || 0;
    const replied = campaign.response_count || 0;
    const read = Math.round(delivered * 0.8);
    return { sent, delivered, failed, replied, read };
  };

  const handleCampaignCreated = () => {
    refetch();
    setMainTab("campaigns");
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header with Gradient */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-6 text-white">
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Megaphone className="h-8 w-8" />
                Central de Campanhas
              </h1>
              <p className="text-white/80 mt-1">
                {stats?.active_campaigns || 0} campanhas ativas • {stats?.total_campaigns || 0} total
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SyncTemplatesButton />
              {mainTab !== "create" && (
                <Button 
                  className="bg-white text-pink-600 hover:bg-white/90" 
                  onClick={() => setMainTab("create")}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Campanha
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={setMainTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Campanhas
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Campanha
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-pink-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Campanhas</p>
                      <p className="text-3xl font-bold">{stats?.total_campaigns || 0}</p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                      <Megaphone className="h-6 w-6 text-pink-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Campanhas Ativas</p>
                      <p className="text-3xl font-bold">{stats?.active_campaigns || 0}</p>
                      {(stats?.active_campaigns || 0) > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                          </span>
                          <span className="text-xs text-blue-500">Em andamento</span>
                        </div>
                      )}
                    </div>
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Send className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Mensagens Enviadas</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold">{stats?.messages_sent_today || 0}</p>
                        <span className="text-sm text-muted-foreground">hoje</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.messages_sent_this_month || 0} este mês
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Resposta</p>
                      <p className="text-3xl font-bold">
                        {(stats?.average_response_rate || 0).toFixed(1)}%
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-500">+2.5% vs mês anterior</span>
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Analytics Section */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Timeline Chart */}
              <div className="lg:col-span-2">
                {analytics && (
                  <CampaignTimelineChart
                    data={analytics.sentByDay}
                    period={analyticsPeriod}
                    onPeriodChange={setAnalyticsPeriod}
                  />
                )}
              </div>

              {/* Pie Chart - Status Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-medium">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Campaigns */}
            {analytics && analytics.topCampaignsByResponse.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top Campanhas por Taxa de Resposta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-5">
                    {analytics.topCampaignsByResponse.slice(0, 5).map((campaign, index) => (
                      <Card 
                        key={campaign.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <CampaignStatusBadge status={campaign.status} size="sm" />
                          </div>
                          <p className="font-medium text-sm truncate">{campaign.name}</p>
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                            {campaign.responseRate.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {campaign.response_count || 0} respostas
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Campaigns List Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <CardTitle className="text-lg">Lista de Campanhas</CardTitle>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar campanhas..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 w-full sm:w-64"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                      <SelectTrigger className="w-40">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="scheduled">Agendada</SelectItem>
                        <SelectItem value="sending">Enviando</SelectItem>
                        <SelectItem value="sent">Enviada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <Tabs value={listTab} onValueChange={setListTab} className="w-full">
                <div className="px-6">
                  <TabsList className="w-full justify-start bg-muted/50 p-1">
                    <TabsTrigger value="all" className="flex-1 sm:flex-none">
                      Todas
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {campaigns.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="flex-1 sm:flex-none">
                      Ativas
                      <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-700">
                        {campaigns.filter(c => c.status === "scheduled" || c.status === "sending").length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="draft" className="flex-1 sm:flex-none">
                      Rascunhos
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex-1 sm:flex-none">
                      Concluídas
                    </TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="h-[500px]">
                  <div className="p-4 space-y-3">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
                        <p>Carregando campanhas...</p>
                      </div>
                    ) : filteredCampaigns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Megaphone className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Nenhuma campanha encontrada</p>
                        <p className="text-sm">Crie sua primeira campanha para começar</p>
                        <Button className="mt-4" onClick={() => setMainTab("create")}>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Campanha
                        </Button>
                      </div>
                    ) : (
                      filteredCampaigns.map((campaign) => {
                        const metrics = getCampaignMetrics(campaign);
                        return (
                          <Card 
                            key={campaign.id}
                            className="hover:shadow-md transition-all cursor-pointer group"
                            onClick={() => setSelectedCampaign(campaign)}
                          >
                            <CardContent className="p-4">
                              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                {/* Campaign Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                      {campaign.name}
                                    </h3>
                                    <CampaignStatusBadge status={campaign.status} />
                                  </div>
                                  
                                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                    {campaign.message}
                                  </p>

                                  {/* Metrics */}
                                  <div className="flex flex-wrap gap-4 text-xs">
                                    <div className="flex items-center gap-1">
                                      <span className="text-muted-foreground">Contatos:</span>
                                      <span className="font-medium">{campaign.target_contacts?.length || 0}</span>
                                    </div>
                                    {metrics.sent > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Enviadas:</span>
                                        <span className="font-medium text-green-600">{metrics.sent}</span>
                                      </div>
                                    )}
                                    {metrics.delivered > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Entregues:</span>
                                        <span className="font-medium text-blue-600">{metrics.delivered}</span>
                                      </div>
                                    )}
                                    {metrics.replied > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-muted-foreground">Respostas:</span>
                                        <span className="font-medium text-purple-600">{metrics.replied}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Progress & Date */}
                                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                {campaign.status === "sent" && metrics.sent > 0 && (
                                    <CampaignProgressBar
                                      sent={metrics.sent}
                                      delivered={metrics.delivered}
                                      failed={metrics.failed}
                                      read={metrics.read}
                                      replied={metrics.replied}
                                      total={campaign.target_contacts?.length || metrics.sent}
                                    />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(campaign.created_at), "dd MMM yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </Tabs>
            </Card>
          </TabsContent>

          {/* Create Campaign Tab */}
          <TabsContent value="create" className="space-y-6">
            <CampaignCreator onCampaignCreated={handleCampaignCreated} />
          </TabsContent>
        </Tabs>

        {/* Campaign Detail Modal */}
        <CampaignDetailModal
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      </div>
    </Layout>
  );
}
