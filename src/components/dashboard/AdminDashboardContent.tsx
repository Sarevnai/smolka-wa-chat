import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { HealthCheckCard } from "@/components/dashboard/HealthCheckCard";
import { SetupProgressBanner } from "@/components/dashboard/SetupProgressBanner";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { DashboardStats } from "@/hooks/useDashboardStats";
import { 
  MessageCircle, 
  Users, 
  Send, 
  Activity,
  Clock,
  Target,
  RefreshCw
} from "lucide-react";
import smolkaLogo from "@/assets/smolka-logo.png";

interface AdminDashboardContentProps {
  stats: DashboardStats;
  onRefresh: () => void;
}

export function AdminDashboardContent({ stats, onRefresh }: AdminDashboardContentProps) {
  return (
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
              Dashboard Geral
            </h1>
            <p className="text-muted-foreground">
              Visão consolidada de todos os setores
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 animate-scale-in [animation-delay:0.2s]">
          <Button onClick={onRefresh} variant="outline" size="sm" className="hover-scale">
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
          
          className="animate-fade-in"
        />
        
        <StatsCard
          title="Mensagens Hoje"
          value={stats.messagestoday}
          description="Mensagens enviadas e recebidas hoje"
          icon={Activity}
          
          className="animate-fade-in [animation-delay:0.1s]"
        />
        
        <StatsCard
          title="Conversas Ativas"
          value={stats.activeConversations}
          description="Conversas nos últimos 7 dias"
          icon={Users}
          
          className="animate-fade-in [animation-delay:0.2s]"
        />
        
        <StatsCard
          title="Taxa de Resposta"
          value={`${stats.responseRate}%`}
          description="Percentual de respostas recebidas"
          icon={Target}
          
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
  );
}
