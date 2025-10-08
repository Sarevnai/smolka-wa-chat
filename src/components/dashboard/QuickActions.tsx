import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
    <TooltipProvider>
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
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Tooltip key={action.title}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="gold"
                    className="group h-16 w-16 rounded-full hover-scale shadow-md hover:shadow-xl hover:shadow-gold-primary/20 transition-[transform,box-shadow] duration-200 active:scale-90 mx-auto animate-scale-in will-change-transform"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <Link to={action.href} className="flex items-center justify-center">
                      <action.icon className="h-7 w-7 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3 group-active:rotate-0" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="animate-scale-in">
                  <p className="font-semibold">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </TooltipContent>
              </Tooltip>
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
          <CardContent className="space-y-1">
            {systemActions.map((action, index) => (
              <Tooltip key={action.title}>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    variant="ghost"
                    className="group w-full justify-start h-12 p-3 hover:bg-accent/50 hover:border-l-2 hover:border-gold-primary hover:pl-[10px] transition-[colors,padding,border] duration-200 active:scale-[0.98]"
                  >
                    <Link to={action.href} className="flex items-center">
                      <action.icon className={`h-5 w-5 mr-3 transition-[transform,colors] duration-200 group-hover:scale-110 group-hover:text-gold-primary ${action.color}`} />
                      <span className="font-medium text-sm transition-transform duration-200 group-hover:translate-x-1">{action.title}</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="animate-scale-in">
                  <p>{action.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}