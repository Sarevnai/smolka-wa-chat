import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Megaphone, Plus, Search, Filter, ArrowLeft,
  Calendar, Send, BarChart3, Clock, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import Layout from "@/components/Layout";
import { useCampaigns, useCampaignStats } from "@/hooks/useCampaigns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type StatusFilter = "all" | "draft" | "scheduled" | "sending" | "sent" | "cancelled";

export default function MarketingCampaigns() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState("list");

  const { data: campaigns = [], isLoading } = useCampaigns();
  const { data: stats } = useCampaignStats();

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { class: string; icon: any; label: string }> = {
      draft: { class: "bg-gray-100 text-gray-800", icon: Clock, label: "Rascunho" },
      scheduled: { class: "bg-blue-100 text-blue-800", icon: Calendar, label: "Agendada" },
      sending: { class: "bg-yellow-100 text-yellow-800", icon: Send, label: "Enviando" },
      sent: { class: "bg-green-100 text-green-800", icon: CheckCircle, label: "Enviada" },
      cancelled: { class: "bg-red-100 text-red-800", icon: XCircle, label: "Cancelada" },
    };
    const config = styles[status] || styles.draft;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.class}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

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
                <Megaphone className="h-8 w-8 text-pink-500" />
                Campanhas Marketing
              </h1>
              <p className="text-muted-foreground mt-1">
                Gerencie suas campanhas de mensagens
              </p>
            </div>
          </div>
          <Button className="bg-pink-500 hover:bg-pink-600" onClick={() => navigate("/send")}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Campanha
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats?.total_campaigns || 0}</p>
                </div>
                <Megaphone className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                  <p className="text-2xl font-bold">{stats?.active_campaigns || 0}</p>
                </div>
                <Send className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Enviadas Hoje</p>
                  <p className="text-2xl font-bold">{stats?.messages_sent_today || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Resposta</p>
                  <p className="text-2xl font-bold">
                    {(stats?.average_response_rate || 0).toFixed(1)}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar campanhas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendada</SelectItem>
                  <SelectItem value="sending">Enviando</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Campaigns List */}
        <Card>
          <CardHeader>
            <CardTitle>Campanhas ({filteredCampaigns.length})</CardTitle>
          </CardHeader>
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Carregando campanhas...
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma campanha encontrada
                </div>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{campaign.name}</p>
                          {getStatusBadge(campaign.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {campaign.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {campaign.target_contacts.length} contatos
                          </span>
                          {campaign.sent_count !== undefined && campaign.sent_count > 0 && (
                            <>
                              <span>•</span>
                              <span>{campaign.sent_count} enviadas</span>
                            </>
                          )}
                          {campaign.response_count !== undefined && campaign.response_count > 0 && (
                            <>
                              <span>•</span>
                              <span>{campaign.response_count} respostas</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {format(new Date(campaign.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {campaign.status === "draft" && (
                          <Button size="sm" onClick={() => navigate("/send")}>
                            <Send className="h-3 w-3 mr-1" />
                            Enviar
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </Layout>
  );
}
