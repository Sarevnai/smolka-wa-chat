import { Link } from "react-router-dom";
import { MessageCircle, Send, ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
const Index = () => {
  const {
    user
  } = useAuth();
  return <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-primary flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Atendimento ADM - Smolka Imóveis</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Gerencie suas mensagens do WhatsApp de forma eficiente com nossa interface limpa e moderna. 
            Visualize mensagens recebidas e envie novas mensagens facilmente.
          </p>
          <div className="flex gap-4 justify-center">
            {user ? <>
                <Button asChild size="lg" className="bg-gradient-primary">
                  <Link to="/inbox">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Ver Mensagens
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/send">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensagem
                  </Link>
                </Button>
              </> : <Button asChild size="lg" className="bg-gradient-primary">
                <Link to="/auth">
                  <LogIn className="mr-2 h-4 w-4" />
                  Fazer Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-accent-foreground" />
              </div>
              <CardTitle>Inbox em Tempo Real</CardTitle>
              <CardDescription>
                Visualize todas as mensagens recebidas em tempo real com filtros avançados por número e período.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Atualização automática de mensagens</li>
                <li>• Filtros por número e data</li>
                <li>• Visualização clara de entrada/saída</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Envio de Mensagens</CardTitle>
              <CardDescription>
                Envie mensagens facilmente através da nossa interface intuitiva com suporte completo à API do WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Interface simples e limpa</li>
                <li>• Suporte a templates e mensagens de texto</li>
                <li>• Feedback imediato de status</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>;
};
export default Index;