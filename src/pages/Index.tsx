import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { HealthCheckCard } from "@/components/dashboard/HealthCheckCard";
import { SetupProgressBanner } from "@/components/dashboard/SetupProgressBanner";
import { 
  MessageCircle, 
  Users, 
  Send, 
  TrendingUp,
  Activity,
  Clock,
  Target,
  RefreshCw,
  ArrowRight,
  LogIn
} from "lucide-react";
import smolkaLogo from "@/assets/smolka-logo.png";

const Index = () => {
  const { user } = useAuth();
  const { stats, loading, refreshStats } = useDashboardStats();

  if (loading && user) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {user ? (
          <div className="space-y-6">
            {/* Setup Progress Banner */}
            <SetupProgressBanner />

            {/* Dashboard Header */}
            <div className="flex items-center justify-between animate-fade-in">
              <div className="flex items-center space-x-4 animate-slide-in-from-left">
                <div className="p-2 bg-primary/10 rounded-lg transition-transform duration-200 hover:scale-110">
                  <img src={smolkaLogo} alt="Logo" className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    Dashboard
                  </h1>
                  <p className="text-muted-foreground">
                    Bem-vindo de volta! Aqui está um resumo das suas atividades.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 animate-scale-in [animation-delay:0.2s]">
                <Button onClick={refreshStats} variant="outline" size="sm" className="hover-scale">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                
                <Button asChild className="hover-scale">
                  <Link to="/chat">Ver Conversas</Link>
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total de Mensagens"
                value={stats.totalMessages}
                description="Todas as mensagens processadas"
                icon={MessageCircle}
                trend={{ value: 12, isPositive: true }}
                className="animate-fade-in"
              />
              
              <StatsCard
                title="Mensagens Hoje"
                value={stats.messagestoday}
                description="Mensagens enviadas e recebidas hoje"
                icon={Activity}
                trend={{ value: 8, isPositive: true }}
                className="animate-fade-in [animation-delay:0.1s]"
              />
              
              <StatsCard
                title="Conversas Ativas"
                value={stats.activeConversations}
                description="Conversas nos últimos 7 dias"
                icon={Users}
                trend={{ value: 23, isPositive: true }}
                className="animate-fade-in [animation-delay:0.2s]"
              />
              
              <StatsCard
                title="Taxa de Resposta"
                value={`${stats.responseRate}%`}
                description="Percentual de respostas recebidas"
                icon={Target}
                trend={{ value: -2, isPositive: false }}
                className="animate-fade-in [animation-delay:0.3s]"
              />
            </div>

            {/* Additional Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title="Total de Contatos"
                value={stats.totalContacts}
                description="Contatos cadastrados"
                icon={Users}
                className="animate-fade-in [animation-delay:0.4s]"
              />
              
              <StatsCard
                title="Campanhas Enviadas"
                value={stats.campaignsSent}
                description="Campanhas de marketing enviadas"
                icon={Send}
                className="animate-fade-in [animation-delay:0.5s]"
              />
              
              <StatsCard
                title="Tempo de Resposta"
                value={stats.avgResponseTime}
                description="Tempo médio de resposta"
                icon={Clock}
                className="animate-fade-in [animation-delay:0.6s]"
              />
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="animate-slide-in-from-left [animation-delay:0.7s]">
                <RecentActivity activities={stats.recentActivity} />
              </div>
              <div className="animate-scale-in [animation-delay:0.8s]">
                <QuickActions />
              </div>
              <div className="animate-fade-in [animation-delay:0.9s]">
                <HealthCheckCard />
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Hero Section for Non-Authenticated Users */}
            <div className="text-center mb-12">
              <div className="flex justify-center mb-6 animate-scale-in">
                <div className="h-20 w-20 rounded-full overflow-hidden hover-scale transition-transform duration-300">
                  <img src={smolkaLogo} alt="Smolka Logo" className="h-full w-full object-cover" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-foreground mb-4 animate-fade-in [animation-delay:0.1s]">Atendimento ADM - Smolka Imóveis</h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in [animation-delay:0.2s]">
                Gerencie suas mensagens do WhatsApp de forma eficiente com nossa interface limpa e moderna. 
                Visualize mensagens recebidas e envie novas mensagens facilmente.
              </p>
              <div className="flex gap-4 justify-center animate-scale-in [animation-delay:0.3s]">
                <Button asChild size="lg" className="bg-gradient-primary hover-scale group">
                  <Link to="/auth">
                    <LogIn className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    Fazer Login
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="group hover:shadow-lg hover-scale transition-[shadow,transform] duration-300 animate-fade-in [animation-delay:0.4s]">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-accent flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <MessageCircle className="h-6 w-6 text-accent-foreground transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <CardTitle className="transition-colors duration-200 group-hover:text-primary">Inbox em Tempo Real</CardTitle>
                  <CardDescription>
                    Visualize todas as mensagens recebidas em tempo real com filtros avançados por número e período.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="transition-transform duration-200 hover:translate-x-1">• Atualização automática de mensagens</li>
                    <li className="transition-transform duration-200 hover:translate-x-1">• Filtros por número e data</li>
                    <li className="transition-transform duration-200 hover:translate-x-1">• Visualização clara de entrada/saída</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover-scale transition-[shadow,transform] duration-300 animate-fade-in [animation-delay:0.5s]">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Send className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <CardTitle className="transition-colors duration-200 group-hover:text-primary">Envio de Mensagens</CardTitle>
                  <CardDescription>
                    Envie mensagens facilmente através da nossa interface intuitiva com suporte completo à API do WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="transition-transform duration-200 hover:translate-x-1">• Interface simples e limpa</li>
                    <li className="transition-transform duration-200 hover:translate-x-1">• Suporte a templates e mensagens de texto</li>
                    <li className="transition-transform duration-200 hover:translate-x-1">• Feedback imediato de status</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;