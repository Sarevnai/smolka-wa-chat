import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Copy, RefreshCw, Eye, EyeOff, Building2, 
  CheckCircle2, XCircle, Clock, TrendingUp, Users, Check, Star, ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  usePortalLeadsLog, 
  usePortalLeadsStats, 
  usePortalConfig, 
  useSavePortalConfig,
  useGenerateToken 
} from "@/hooks/usePortalLeads";
import { useContactLists } from "@/hooks/useContactLists";

const SUPABASE_PROJECT_ID = "wpjxsgxxhogzkkuznyke";

// Canal Pro configuration steps
const canalProSteps = [
  { step: 1, title: "Acesse o Canal Pro", description: "Entre em canalpro.com.br com suas credenciais" },
  { step: 2, title: "Vá em Configurações", description: "Menu → Configurações → Recebimento de Leads" },
  { step: 3, title: "Configure o Webhook", description: "Cole a URL e token na seção de integração webhook" },
  { step: 4, title: "Teste a integração", description: "Use o botão 'Enviar Lead de Teste' do Canal Pro" }
];

export default function PortalIntegration() {
  const navigate = useNavigate();
  const [showToken, setShowToken] = useState(false);
  
  const { data: logs, isLoading: logsLoading } = usePortalLeadsLog(20);
  const { data: stats, isLoading: statsLoading } = usePortalLeadsStats();
  const { data: config, isLoading: configLoading } = usePortalConfig();
  const { data: contactLists } = useContactLists();
  const saveConfig = useSavePortalConfig();
  const generateToken = useGenerateToken();

  const [localConfig, setLocalConfig] = useState({
    default_list_id: '',
    auto_create_conversation: false,
    send_welcome_message: false,
    sell_department: 'vendas',
    rent_department: 'locacao'
  });

  // Sync local config with fetched config
  useState(() => {
    if (config) {
      setLocalConfig({
        default_list_id: config.default_list_id || '',
        auto_create_conversation: config.auto_create_conversation || false,
        send_welcome_message: config.send_welcome_message || false,
        sell_department: config.sell_department || 'vendas',
        rent_department: config.rent_department || 'locacao'
      });
    }
  });

  const webhookUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/portal-leads-webhook?token=${config?.webhook_token || 'GERAR_TOKEN'}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleSaveConfig = () => {
    saveConfig.mutate(localConfig);
  };

  const handleGenerateToken = () => {
    generateToken.mutate();
  };

  const individualPortals = [
    { name: 'ZAP Imóveis', logo: '🏠', color: 'bg-orange-500' },
    { name: 'Viva Real', logo: '🏡', color: 'bg-green-500' },
    { name: 'OLX Imóveis', logo: '📦', color: 'bg-purple-500' },
    { name: 'Chaves na Mão', logo: '🔑', color: 'bg-yellow-500' }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Processado</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    }
  };

  if (configLoading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/integrations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Integração com Portais Imobiliários
            </h1>
            <p className="text-muted-foreground">
              Configure a integração para receber leads do ZAP, Viva Real e OLX
            </p>
          </div>
        </div>

        {/* Webhook URL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">URL do Webhook</CardTitle>
            <CardDescription>
              Copie esta URL e cadastre no painel de cada portal imobiliário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => copyToClipboard(webhookUrl, 'URL')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token de Autenticação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Token de Autenticação</CardTitle>
            <CardDescription>
              Token único para validar as requisições dos portais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input 
                  value={config?.webhook_token || ''} 
                  type={showToken ? 'text' : 'password'}
                  readOnly 
                  className="font-mono text-sm pr-10"
                  placeholder="Clique em 'Gerar Token' para criar"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button 
                variant="outline"
                onClick={() => config?.webhook_token && copyToClipboard(config.webhook_token, 'Token')}
                disabled={!config?.webhook_token}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
              <Button 
                onClick={handleGenerateToken}
                disabled={generateToken.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateToken.isPending ? 'animate-spin' : ''}`} />
                {config?.webhook_token ? 'Regenerar' : 'Gerar Token'}
              </Button>
            </div>
            {config?.webhook_token && (
              <p className="text-sm text-muted-foreground">
                ⚠️ Ao regenerar o token, você precisará atualizar a configuração em todos os portais.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Configurações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações</CardTitle>
            <CardDescription>
              Personalize como os leads serão processados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Lista padrão para leads</Label>
              <Select 
                value={localConfig.default_list_id}
                onValueChange={(value) => setLocalConfig(prev => ({ ...prev, default_list_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma lista" />
                </SelectTrigger>
                <SelectContent>
                  {contactLists?.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Novos leads serão adicionados automaticamente a esta lista
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Departamento para Venda (SELL)</Label>
                <Select 
                  value={localConfig.sell_department}
                  onValueChange={(value) => setLocalConfig(prev => ({ ...prev, sell_department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Departamento para Locação (RENT)</Label>
                <Select 
                  value={localConfig.rent_department}
                  onValueChange={(value) => setLocalConfig(prev => ({ ...prev, rent_department: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locacao">Locação</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Criar conversa automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Inicia uma conversa no chat quando um lead chegar
                  </p>
                </div>
                <Switch
                  checked={localConfig.auto_create_conversation}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, auto_create_conversation: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Enviar mensagem de boas-vindas</Label>
                  <p className="text-sm text-muted-foreground">
                    Envia uma mensagem automática via WhatsApp (em breve)
                  </p>
                </div>
                <Switch
                  checked={localConfig.send_welcome_message}
                  onCheckedChange={(checked) => setLocalConfig(prev => ({ ...prev, send_welcome_message: checked }))}
                  disabled
                />
              </div>
            </div>

            <Button 
              onClick={handleSaveConfig} 
              className="w-full"
              disabled={saveConfig.isPending}
            >
              {saveConfig.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>

        {/* Canal Pro - Recomendado */}
        <Card className="border-2 border-primary bg-gradient-to-r from-primary/5 to-primary/10 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Recomendado
            </Badge>
          </div>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Building2 className="h-10 w-10 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Canal Pro</CardTitle>
                <CardDescription className="text-base">
                  Centralize todos os leads de ZAP, Viva Real e OLX em uma única integração
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefícios */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Configuração Única</p>
                  <p className="text-xs text-muted-foreground">Uma integração para todos os portais</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Tempo Real</p>
                  <p className="text-xs text-muted-foreground">Leads via webhook instantâneo</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">Origem Identificada</p>
                  <p className="text-xs text-muted-foreground">Saiba de qual portal veio o lead</p>
                </div>
              </div>
            </div>

            {/* Portais incluídos */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Portais incluídos:</span>
              <Badge variant="secondary" className="gap-1">🏠 ZAP Imóveis</Badge>
              <Badge variant="secondary" className="gap-1">🏡 Viva Real</Badge>
              <Badge variant="secondary" className="gap-1">📦 OLX Imóveis</Badge>
            </div>

            {/* Passo a Passo */}
            <div className="border-t pt-4">
              <p className="font-medium mb-3 flex items-center gap-2">
                <span>📋</span> Como configurar no Canal Pro
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {canalProSteps.map((item) => (
                  <div key={item.step} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                        {item.step}
                      </span>
                      <span className="font-medium text-sm">{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Link para Canal Pro */}
            <Button variant="outline" className="w-full" asChild>
              <a href="https://www.canalpro.com.br" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Acessar Canal Pro
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* Portais Individuais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portais Individuais</CardTitle>
            <CardDescription>
              Configure individualmente caso não utilize o Canal Pro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {individualPortals.map((portal) => (
                <div 
                  key={portal.name}
                  className="p-4 border rounded-lg text-center space-y-2 hover:border-primary/50 transition-colors"
                >
                  <span className="text-3xl">{portal.logo}</span>
                  <p className="font-medium text-sm">{portal.name}</p>
                  <Badge variant="outline" className="text-green-600 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Suportado
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              💡 Use a mesma URL e token do webhook acima para configurar cada portal individualmente
            </p>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats?.today || 0}</p>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{stats?.thisWeek || 0}</p>
                  <p className="text-sm text-muted-foreground">Esta Semana</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{stats?.processed || 0}</p>
                  <p className="text-sm text-muted-foreground">Processados</p>
                </div>
              </div>
            )}
            
            {stats && Object.keys(stats.byPortal).length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium mb-2">Por Portal:</p>
                <div className="flex gap-4">
                  {Object.entries(stats.byPortal).map(([portal, count]) => (
                    <Badge key={portal} variant="secondary" className="text-sm">
                      {portal}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Histórico de Leads
            </CardTitle>
            <CardDescription>
              Últimos leads recebidos dos portais
            </CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Portal</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.portal_origin}</Badge>
                        </TableCell>
                        <TableCell>{log.contact_name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.contact_phone || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum lead recebido ainda</p>
                <p className="text-sm">Configure os portais para começar a receber leads</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
