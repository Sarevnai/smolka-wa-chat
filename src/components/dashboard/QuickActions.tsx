import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  MessageCircle, 
  Users, 
  PlusCircle,
  BarChart3,
  Settings,
  FileText,
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const quickActions = [
  {
    title: "Nova Campanha",
    description: "Enviar mensagem para múltiplos contatos",
    icon: Send,
    href: "/send",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    title: "Ver Conversas",
    description: "Acessar chat e mensagens",
    icon: MessageCircle,
    href: "/chat",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    title: "Adicionar Contato",
    description: "Cadastrar novo contato",
    icon: PlusCircle,
    href: "/contacts",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    title: "Ver Relatórios",
    description: "Analisar métricas e dados",
    icon: BarChart3,
    href: "/reports",
    color: "bg-orange-500 hover:bg-orange-600"
  }
];

const systemActions = [
  {
    title: "Configurar Integrações",
    description: "Gerenciar conexões externas",
    icon: Settings,
    href: "/integrations",
    color: "text-muted-foreground hover:text-foreground"
  },
  {
    title: "Templates WhatsApp",
    description: "Sincronizar templates",
    icon: FileText,
    href: "/send",
    color: "text-muted-foreground hover:text-foreground"
  },
  {
    title: "Automações",
    description: "Configurar respostas automáticas",
    icon: Zap,
    href: "/integrations",
    color: "text-muted-foreground hover:text-foreground"
  }
];

export function QuickActions() {
  return (
    <div className="space-y-6">
      {/* Main Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Acesse as funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              asChild
              className="w-full justify-start h-auto p-4 hover-scale shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link to={action.href}>
                <div className="flex items-center space-x-3">
                  <action.icon className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-medium">{action.title}</div>
                    <div className="text-xs opacity-90">{action.description}</div>
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações
          </CardTitle>
          <CardDescription>
            Configurar e personalizar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {systemActions.map((action) => (
            <Button
              key={action.title}
              asChild
              variant="ghost"
              className="w-full justify-start h-auto p-3 hover:bg-accent/50 transition-colors story-link"
            >
              <Link to={action.href}>
                <div className="flex items-center space-x-3">
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <div className="text-left">
                    <div className="font-medium text-sm">{action.title}</div>
                    <div className="text-xs text-muted-foreground">{action.description}</div>
                  </div>
                </div>
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}