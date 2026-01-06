import { useState } from "react";
import { Megaphone, Plus, History, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import CampaignCreator from "@/components/marketing/CampaignCreator";
import { useCampaigns } from "@/hooks/useCampaigns";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";

export default function Send() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState("create");
  
  const { toast } = useToast();
  const { data: campaigns = [], isLoading: campaignsLoading } = useCampaigns();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return 'Enviada';
      case 'scheduled': return 'Agendada';
      case 'sending': return 'Enviando';
      case 'draft': return 'Rascunho';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (permissions.loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Verificando permissões...</div>
        </div>
      </Layout>
    );
  }

  if (!permissions.canViewCampaigns) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Alert variant="destructive" className="max-w-md">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>Acesso Negado</AlertTitle>
            <AlertDescription>
              Você não tem permissão para acessar campanhas.
              <br />
              Entre em contato com um administrador se precisar de acesso.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Campanhas
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie campanhas de mensagens em massa para seus contatos
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Campanha
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Estatísticas
            </TabsTrigger>
          </TabsList>

          {/* Create Campaign Tab */}
          <TabsContent value="create" className="space-y-6">
            <CampaignCreator onCampaignCreated={() => setActiveTab("history")} />
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Campanhas
                </CardTitle>
                <CardDescription>
                  Visualize todas as campanhas enviadas e seus resultados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {campaignsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando campanhas...
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma campanha encontrada.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {campaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="p-4 border border-border rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{campaign.name}</h3>
                          <Badge className={getStatusColor(campaign.status)}>
                            {getStatusLabel(campaign.status)}
                          </Badge>
                        </div>
                        
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {campaign.message}
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Contatos:</span>
                            <p className="font-medium">{campaign.target_contacts.length}</p>
                          </div>
                          
                          {campaign.sent_count !== undefined && (
                            <div>
                              <span className="text-muted-foreground">Enviadas:</span>
                              <p className="font-medium text-green-600">{campaign.sent_count}</p>
                            </div>
                          )}
                          
                          {campaign.failed_count !== undefined && campaign.failed_count > 0 && (
                            <div>
                              <span className="text-muted-foreground">Falharam:</span>
                              <p className="font-medium text-red-600">{campaign.failed_count}</p>
                            </div>
                          )}
                          
                          <div>
                            <span className="text-muted-foreground">
                              {campaign.scheduled_at ? 'Agendada:' : 'Criada:'}
                            </span>
                            <p className="font-medium">
                              {new Date(campaign.scheduled_at || campaign.created_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Total de Campanhas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{campaigns.length}</div>
                  <p className="text-xs text-muted-foreground">Campanhas criadas</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Campanhas Ativas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {campaigns.filter(c => c.status === 'scheduled' || c.status === 'sending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">Agendadas ou enviando</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mensagens Enviadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {campaigns.reduce((total, campaign) => total + (campaign.sent_count || 0), 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">Total de mensagens</p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Campanhas por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['draft', 'scheduled', 'sending', 'sent', 'cancelled'].map((status) => {
                    const count = campaigns.filter(c => c.status === status).length;
                    const percentage = campaigns.length > 0 ? (count / campaigns.length) * 100 : 0;
                    
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(status)} variant="outline">
                            {getStatusLabel(status)}
                          </Badge>
                          <span className="text-sm">{count} campanhas</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
