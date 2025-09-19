import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, ExternalLink, CheckCircle, XCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const integrations = [
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Sincronize tickets automaticamente com suas listas do ClickUp para melhor gestão de tarefas',
    icon: Settings,
    status: 'connected', // connected | disconnected | pending
    configPath: '/clickup',
    features: [
      'Criação automática de tasks',
      'Sincronização de status',
      'Campos customizados',
      'Webhooks bidirecionais'
    ]
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    description: 'Integração nativa com WhatsApp Business API para envio e recebimento de mensagens',
    icon: Settings,
    status: 'connected',
    configPath: '/whatsapp-config',
    features: [
      'Envio de mensagens',
      'Templates aprovados',
      'Webhooks em tempo real',
      'Mídia e documentos'
    ]
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Conecte com centenas de aplicações através do Zapier para automações avançadas',
    icon: Settings,
    status: 'disconnected',
    configPath: '/zapier-config',
    features: [
      'Automações personalizadas',
      'Triggers por eventos',
      'Integração com CRM',
      'Sincronização de dados'
    ]
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Exporte e sincronize dados de contatos e relatórios com planilhas do Google',
    icon: Settings,
    status: 'pending',
    configPath: '/google-sheets-config',
    features: [
      'Export automático',
      'Sincronização bidirecional',
      'Relatórios dinâmicos',
      'Backup de dados'
    ]
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'disconnected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return null;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'connected':
      return 'Conectado';
    case 'disconnected':
      return 'Desconectado';
    case 'pending':
      return 'Pendente';
    default:
      return '';
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'connected':
      return 'default';
    case 'disconnected':
      return 'destructive';
    case 'pending':
      return 'secondary';
    default:
      return 'outline';
  }
};

export default function Integrations() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Integrações</h1>
          <p className="text-muted-foreground mt-2">
            Configure e gerencie todas as integrações do sistema em um só lugar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="relative h-full flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <integration.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {getStatusIcon(integration.status)}
                        <Badge variant={getStatusVariant(integration.status)} className="text-xs">
                          {getStatusText(integration.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-3">
                  {integration.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div>
                  <h4 className="text-sm font-medium mb-3 text-foreground">Recursos:</h4>
                  <ul className="space-y-2">
                    {integration.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>

              <CardFooter className="pt-4">
                <div className="flex gap-2 w-full">
                  <Button asChild className="flex-1" variant="outline">
                    <Link to={integration.configPath}>
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Link>
                  </Button>
                  {integration.status === 'connected' && (
                    <Button size="sm" variant="ghost">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Precisa de Ajuda?
            </CardTitle>
            <CardDescription>
              Nossa equipe está aqui para ajudar você a configurar suas integrações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex-1">
                Ver Documentação
              </Button>
              <Button variant="outline" className="flex-1">
                Contatar Suporte
              </Button>
              <Button variant="default" className="flex-1">
                Solicitar Nova Integração
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}