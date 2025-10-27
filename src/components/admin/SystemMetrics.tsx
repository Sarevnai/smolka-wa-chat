import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminStats } from '@/hooks/admin/useAdminStats';
import { Users, MessageSquare, Contact, Send, Ticket, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SystemMetricsProps {
  stats: AdminStats | null;
  loading: boolean;
}

export function SystemMetrics({ stats, loading }: SystemMetricsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-3 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total de Usuários',
      value: stats.totalUsers,
      description: `${stats.activeUsers} ativos, ${stats.inactiveUsers} inativos`,
      icon: Users,
      trend: stats.activeUsers > 0 ? 'positive' : 'neutral',
    },
    {
      title: 'Mensagens (Total)',
      value: stats.totalMessages.toLocaleString('pt-BR'),
      description: `${stats.messagesLast24h} nas últimas 24h`,
      icon: MessageSquare,
      trend: 'positive',
    },
    {
      title: 'Mensagens (30 dias)',
      value: stats.messagesLast30d.toLocaleString('pt-BR'),
      description: `${stats.messagesLast7d} nos últimos 7 dias`,
      icon: Activity,
      trend: 'positive',
    },
    {
      title: 'Contatos',
      value: stats.totalContacts.toLocaleString('pt-BR'),
      description: 'Contatos cadastrados',
      icon: Contact,
      trend: 'neutral',
    },
    {
      title: 'Campanhas',
      value: stats.totalCampaigns,
      description: 'Campanhas criadas',
      icon: Send,
      trend: 'neutral',
    },
    {
      title: 'Tickets',
      value: stats.totalTickets,
      description: 'Tickets abertos',
      icon: Ticket,
      trend: 'neutral',
    },
    {
      title: 'Admins',
      value: stats.usersByRole.admin,
      description: 'Administradores',
      icon: Users,
      trend: 'neutral',
    },
    {
      title: 'Status do Sistema',
      value: (
        <Badge
          variant={
            stats.systemHealth === 'healthy'
              ? 'default'
              : stats.systemHealth === 'warning'
              ? 'secondary'
              : 'destructive'
          }
        >
          {stats.systemHealth === 'healthy'
            ? '✅ Saudável'
            : stats.systemHealth === 'warning'
            ? '⚠️ Atenção'
            : '🚨 Crítico'}
        </Badge>
      ),
      description: 'Saúde geral',
      icon: Activity,
      trend: 'neutral',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={index} className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof metric.value === 'number' ? metric.value : metric.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
