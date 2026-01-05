import { useState } from "react";
import { 
  X, Calendar, Users, Send, CheckCircle, Eye, MessageCircle, 
  AlertCircle, ExternalLink, Copy, Ban
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Campaign } from "@/types/campaign";
import { useCampaignResultsDetails } from "@/hooks/useCampaignAnalytics";
import CampaignStatusBadge from "./CampaignStatusBadge";
import CampaignProgressBar from "./CampaignProgressBar";
import CampaignQuickStats from "./CampaignQuickStats";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
}

export default function CampaignDetailModal({ 
  campaign, 
  open, 
  onClose 
}: CampaignDetailModalProps) {
  const [searchResults, setSearchResults] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: results = [], isLoading: loadingResults } = useCampaignResultsDetails(
    campaign?.id || ""
  );

  if (!campaign) return null;

  const sent = campaign.sent_count || 0;
  const delivered = campaign.delivered_count || 0;
  const failed = campaign.failed_count || 0;
  const replied = campaign.response_count || 0;
  const read = Math.round(delivered * 0.8); // Estimativa de leitura

  const filteredResults = results.filter((r: any) => {
    const matchesSearch = 
      !searchResults || 
      r.phone.includes(searchResults) ||
      r.contacts?.name?.toLowerCase().includes(searchResults.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getResultStatusBadge = (status: string) => {
    const config: Record<string, { className: string; icon: any; label: string }> = {
      sent: { 
        className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", 
        icon: Send, 
        label: "Enviada" 
      },
      delivered: { 
        className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", 
        icon: CheckCircle, 
        label: "Entregue" 
      },
      read: { 
        className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", 
        icon: Eye, 
        label: "Lida" 
      },
      replied: { 
        className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", 
        icon: MessageCircle, 
        label: "Respondida" 
      },
      failed: { 
        className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", 
        icon: AlertCircle, 
        label: "Falhou" 
      },
    };
    const c = config[status] || config.sent;
    const Icon = c.icon;
    return (
      <Badge variant="outline" className={cn("text-xs", c.className)}>
        <Icon className="h-3 w-3 mr-1" />
        {c.label}
      </Badge>
    );
  };

  const handleOpenConversation = (phone: string) => {
    navigate(`/marketing/chat/${phone}`);
    onClose();
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(campaign.message);
    toast({
      title: "Copiado!",
      description: "Mensagem copiada para a área de transferência.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                {campaign.name}
                <CampaignStatusBadge status={campaign.status} size="lg" />
              </DialogTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Criada em {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {campaign.target_contacts.length} contatos
                </span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <div className="px-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="results">
                Resultados ({results.length})
              </TabsTrigger>
              <TabsTrigger value="message">Mensagem</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[60vh]">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                {/* Quick Stats */}
                <Card>
                  <CardContent className="pt-6">
                    <CampaignQuickStats
                      sent={sent}
                      delivered={delivered}
                      read={read}
                      replied={replied}
                      failed={failed}
                    />
                  </CardContent>
                </Card>

                {/* Progress Bar */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-medium mb-4">Progresso de Entrega</h4>
                    <CampaignProgressBar
                      sent={sent}
                      delivered={delivered}
                      read={read}
                      replied={replied}
                      failed={failed}
                      total={campaign.target_contacts.length}
                      showLabels
                      size="lg"
                    />
                  </CardContent>
                </Card>

                {/* Funnel Visual */}
                <Card>
                  <CardContent className="pt-6">
                    <h4 className="text-sm font-medium mb-4">Funil de Conversão</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Enviadas", value: sent, color: "bg-gray-500", width: 100 },
                        { label: "Entregues", value: delivered, color: "bg-blue-500", width: sent > 0 ? (delivered / sent) * 100 : 0 },
                        { label: "Lidas", value: read, color: "bg-green-500", width: sent > 0 ? (read / sent) * 100 : 0 },
                        { label: "Respondidas", value: replied, color: "bg-purple-500", width: sent > 0 ? (replied / sent) * 100 : 0 },
                      ].map((step, index) => (
                        <div key={step.label} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-muted-foreground">{step.label}</div>
                          <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                            <div 
                              className={cn(step.color, "h-full transition-all duration-500 flex items-center justify-end pr-2")}
                              style={{ width: `${step.width}%` }}
                            >
                              <span className="text-xs font-medium text-white">{step.value}</span>
                            </div>
                          </div>
                          <div className="w-16 text-right text-sm font-medium">
                            {step.width.toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results" className="mt-0 space-y-4">
                {/* Filters */}
                <div className="flex gap-4">
                  <Input
                    placeholder="Buscar por telefone ou nome..."
                    value={searchResults}
                    onChange={(e) => setSearchResults(e.target.value)}
                    className="max-w-sm"
                  />
                  <div className="flex gap-2">
                    {["all", "sent", "delivered", "read", "replied", "failed"].map((status) => (
                      <Button
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                      >
                        {status === "all" ? "Todos" : 
                         status === "sent" ? "Enviadas" :
                         status === "delivered" ? "Entregues" :
                         status === "read" ? "Lidas" :
                         status === "replied" ? "Respondidas" : "Falhas"}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Results List */}
                {loadingResults ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando resultados...
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map((result: any) => (
                      <Card key={result.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium">
                                  {result.contacts?.name || result.phone}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {result.phone}
                                </p>
                              </div>
                              {getResultStatusBadge(result.status)}
                            </div>
                            <div className="flex items-center gap-2">
                              {result.sent_at && (
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(result.sent_at), "dd/MM HH:mm")}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenConversation(result.phone)}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {result.error_message && (
                            <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {result.error_message}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="message" className="mt-0">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium">Preview da Mensagem</h4>
                      <Button variant="outline" size="sm" onClick={handleCopyMessage}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    
                    {/* WhatsApp-style preview */}
                    <div className="bg-[#ECE5DD] dark:bg-gray-800 rounded-lg p-4 max-w-md">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-sm">
                        {campaign.header_media_url && (
                          <div className="mb-2 rounded-lg overflow-hidden">
                            {campaign.header_media_type === 'image' && (
                              <img 
                                src={campaign.header_media_url} 
                                alt="Header" 
                                className="w-full h-32 object-cover"
                              />
                            )}
                            {campaign.header_media_type === 'video' && (
                              <video 
                                src={campaign.header_media_url} 
                                className="w-full h-32 object-cover"
                                controls
                              />
                            )}
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                          {campaign.message}
                        </p>
                        <p className="text-right text-xs text-gray-500 mt-1">
                          {format(new Date(campaign.created_at), "HH:mm")}
                        </p>
                      </div>
                    </div>

                    {campaign.wa_template_id && (
                      <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          Template WhatsApp: {campaign.wa_template_id}
                        </Badge>
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
