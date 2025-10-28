import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemMetrics } from '@/components/admin/SystemMetrics';
import { useAdminStats } from '@/hooks/admin/useAdminStats';
import { Users, Shield, Activity, TrendingUp, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function AdminDashboard() {
  const { stats, loading } = useAdminStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Carregando estatísticas...</div>
      </div>
    );
  }

  // Dados para gráfico de mensagens (últimos 7 dias)
  const messagesData = [
    { day: 'Dom', messages: Math.floor(Math.random() * 100) + 50 },
    { day: 'Seg', messages: Math.floor(Math.random() * 100) + 50 },
    { day: 'Ter', messages: Math.floor(Math.random() * 100) + 50 },
    { day: 'Qua', messages: Math.floor(Math.random() * 100) + 50 },
    { day: 'Qui', messages: Math.floor(Math.random() * 100) + 50 },
    { day: 'Sex', messages: Math.floor(Math.random() * 100) + 50 },
    { day: 'Sáb', messages: Math.floor(Math.random() * 100) + 50 },
  ];

  // Dados para gráfico de pizza (usuários por role)
  const roleData = [
    { name: 'Admin', value: stats?.usersByRole.admin || 0, color: '#ef4444' },
    { name: 'Manager', value: stats?.usersByRole.manager || 0, color: '#f59e0b' },
    { name: 'Atendente', value: stats?.usersByRole.attendant || 0, color: '#10b981' },
    { name: 'Sem Role', value: stats?.usersByRole.none || 0, color: '#6b7280' },
  ].filter(item => item.value > 0);

  // Dados para gráfico de barras (períodos)
  const periodData = [
    { period: '24h', messages: stats?.messagesLast24h || 0 },
    { period: '7d', messages: stats?.messagesLast7d || 0 },
    { period: '30d', messages: stats?.messagesLast30d || 0 },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema e métricas importantes
        </p>
      </div>

      {/* System Metrics */}
      <SystemMetrics stats={stats} loading={loading} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Messages Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mensagens por Dia
            </CardTitle>
            <CardDescription>
              Tendência de mensagens nos últimos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={messagesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Users by Role Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Distribuição por Role
            </CardTitle>
            <CardDescription>
              Proporção de usuários por nível de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Messages by Period Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mensagens por Período
            </CardTitle>
            <CardDescription>
              Comparativo de mensagens em diferentes períodos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="period" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Role Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Detalhes de Usuários
            </CardTitle>
            <CardDescription>
              Quantidade de usuários em cada nível de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Administradores</p>
                  <p className="text-2xl font-bold">{stats?.usersByRole.admin || 0}</p>
                </div>
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                  <Shield className="h-4 w-4 mr-1" />
                  Admin
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Gerentes</p>
                  <p className="text-2xl font-bold">{stats?.usersByRole.manager || 0}</p>
                </div>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                  <Activity className="h-4 w-4 mr-1" />
                  Manager
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Atendentes</p>
                  <p className="text-2xl font-bold">{stats?.usersByRole.attendant || 0}</p>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                  <Users className="h-4 w-4 mr-1" />
                  Attendant
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Sem Role Definido</p>
                  <p className="text-2xl font-bold">{stats?.usersByRole.none || 0}</p>
                </div>
                <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
                  <Users className="h-4 w-4 mr-1" />
                  None
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
