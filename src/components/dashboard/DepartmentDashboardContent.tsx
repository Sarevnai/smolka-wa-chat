import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { DashboardStats } from "@/hooks/useDashboardStats";
import { Database } from "@/integrations/supabase/types";
import { 
  MessageCircle, 
  Users, 
  Activity,
  Clock,
  Target,
  RefreshCw,
  AlertTriangle,
  Ticket,
  CheckCircle,
  TrendingUp,
  Home,
  ShoppingBag,
  Building2
} from "lucide-react";

type DepartmentType = Database['public']['Enums']['department_type'];

interface DepartmentDashboardContentProps {
  department: DepartmentType;
  stats: DashboardStats;
  onRefresh: () => void;
}

const DEPARTMENT_CONFIG = {
  locacao: {
    label: 'Locação',
    icon: Home,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Métricas do setor de locação'
  },
  vendas: {
    label: 'Vendas',
    icon: ShoppingBag,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    description: 'Métricas do setor de vendas'
  },
  administrativo: {
    label: 'Administrativo',
    icon: Building2,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    description: 'Métricas do setor administrativo'
  },
  marketing: {
    label: 'Marketing',
    icon: TrendingUp,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    description: 'Métricas do setor de marketing'
  }
};

export function DepartmentDashboardContent({ department, stats, onRefresh }: DepartmentDashboardContentProps) {
  const config = DEPARTMENT_CONFIG[department] || DEPARTMENT_CONFIG.locacao;
  const Icon = config.icon;

  // Renderiza dashboard específico para o administrativo
  if (department === 'administrativo') {
    return (
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-4 animate-slide-in-from-left">
            <div className={`p-2 ${config.bgColor} rounded-lg transition-transform duration-200 hover:scale-110`}>
              <Icon className={`h-8 w-8 ${config.color}`} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Dashboard {config.label}
              </h1>
              <p className="text-muted-foreground">
                {config.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 animate-scale-in [animation-delay:0.2s]">
            <Button onClick={onRefresh} variant="outline" size="sm" className="hover-scale">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            
            <Button asChild className="hover-scale">
              <Link to="/triage">Ver Triagem</Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards - Administrativo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Triagens Pendentes"
            value={stats.triagePending || 0}
            description="Conversas aguardando triagem"
            icon={AlertTriangle}
            trend={{ value: 5, isPositive: false }}
            className="animate-fade-in"
          />
          
          <StatsCard
            title="Tickets Ativos"
            value={stats.activeTickets || 0}
            description="Tickets em andamento"
            icon={Ticket}
            className="animate-fade-in [animation-delay:0.1s]"
          />
          
          <StatsCard
            title="Tickets Concluídos"
            value={stats.completedTickets || 0}
            description="Tickets finalizados hoje"
            icon={CheckCircle}
            trend={{ value: 12, isPositive: true }}
            className="animate-fade-in [animation-delay:0.2s]"
          />
          
          <StatsCard
            title="Tempo Médio Resolução"
            value={stats.avgResolutionTime || '0min'}
            description="Tempo médio para resolver tickets"
            icon={Clock}
            className="animate-fade-in [animation-delay:0.3s]"
          />
        </div>

        {/* Triagem por Destino */}
        <Card className="animate-fade-in [animation-delay:0.4s]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Triagens por Setor de Destino
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.triageToLocacao || 0}</p>
                <p className="text-sm text-muted-foreground">Locação</p>
              </div>
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.triageToVendas || 0}</p>
                <p className="text-sm text-muted-foreground">Vendas</p>
              </div>
              <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-950/30 text-center">
                <p className="text-2xl font-bold text-pink-600">{stats.triageToMarketing || 0}</p>
                <p className="text-sm text-muted-foreground">Marketing</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/30 text-center">
                <p className="text-2xl font-bold text-slate-600">{stats.triageToAdministrativo || 0}</p>
                <p className="text-sm text-muted-foreground">Administrativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="animate-slide-in-from-left [animation-delay:0.5s]">
          <RecentActivity activities={stats.recentActivity} />
        </div>
      </div>
    );
  }

  // Dashboard para Locação e Vendas
  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center space-x-4 animate-slide-in-from-left">
          <div className={`p-2 ${config.bgColor} rounded-lg transition-transform duration-200 hover:scale-110`}>
            <Icon className={`h-8 w-8 ${config.color}`} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dashboard {config.label}
            </h1>
            <p className="text-muted-foreground">
              {config.description}
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

      {/* Stats Cards - Locação/Vendas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Mensagens Hoje"
          value={stats.messagestoday}
          description="Mensagens do setor hoje"
          icon={MessageCircle}
          trend={{ value: 8, isPositive: true }}
          className="animate-fade-in"
        />
        
        <StatsCard
          title="Conversas Ativas"
          value={stats.activeConversations}
          description="Conversas nos últimos 7 dias"
          icon={Users}
          trend={{ value: 15, isPositive: true }}
          className="animate-fade-in [animation-delay:0.1s]"
        />
        
        <StatsCard
          title="Leads Qualificados"
          value={stats.qualifiedLeads || 0}
          description="Leads qualificados no período"
          icon={Target}
          trend={{ value: 10, isPositive: true }}
          className="animate-fade-in [animation-delay:0.2s]"
        />
        
        <StatsCard
          title="Taxa de Resposta"
          value={`${stats.responseRate}%`}
          description="Percentual de respostas"
          icon={Activity}
          className="animate-fade-in [animation-delay:0.3s]"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          title="Contatos do Setor"
          value={stats.totalContacts}
          description="Contatos cadastrados"
          icon={Users}
          className="animate-fade-in [animation-delay:0.4s]"
        />
        
        <StatsCard
          title="Pipeline"
          value={stats.pipelineCount || 0}
          description="Conversas no pipeline"
          icon={TrendingUp}
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
      <div className="animate-slide-in-from-left [animation-delay:0.7s]">
        <RecentActivity activities={stats.recentActivity} />
      </div>
    </div>
  );
}
