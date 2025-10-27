import Layout from '@/components/Layout';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { useAdminStats } from '@/hooks/admin/useAdminStats';
import { SystemMetrics } from '@/components/admin/SystemMetrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AdminDashboard() {
  const { stats, loading, refetch } = useAdminStats();

  return (
    <AdminGuard>
      <Layout>
        <div className="space-y-6 p-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
                <p className="text-muted-foreground">
                  Visão geral do sistema e estatísticas em tempo real
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Métricas do Sistema */}
          <SystemMetrics stats={stats} loading={loading} />

          {/* Detalhes por Role */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Usuários por Role</CardTitle>
                  <CardDescription>
                    Breakdown de permissões no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge>Administradores</Badge>
                    </div>
                    <span className="text-2xl font-bold">{stats.usersByRole.admin}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Gerentes</Badge>
                    </div>
                    <span className="text-2xl font-bold">{stats.usersByRole.manager}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Atendentes</Badge>
                    </div>
                    <span className="text-2xl font-bold">{stats.usersByRole.attendant}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Sem Permissão</Badge>
                    </div>
                    <span className="text-2xl font-bold text-muted-foreground">
                      {stats.usersByRole.none}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status dos Usuários</CardTitle>
                  <CardDescription>
                    Estado atual dos usuários no sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">✅ Usuários Ativos</span>
                    <span className="text-2xl font-bold text-green-600">
                      {stats.activeUsers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">⏸️ Usuários Inativos</span>
                    <span className="text-2xl font-bold text-yellow-600">
                      {stats.inactiveUsers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">🚫 Usuários Bloqueados</span>
                    <span className="text-2xl font-bold text-red-600">
                      {stats.blockedUsers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-sm font-medium">📊 Total</span>
                    <span className="text-2xl font-bold">
                      {stats.totalUsers}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Atividade Recente - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade do Sistema</CardTitle>
              <CardDescription>
                Estatísticas de mensagens nos últimos períodos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Últimas 24 horas</p>
                    <p className="text-3xl font-bold">{stats.messagesLast24h.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
                    <p className="text-3xl font-bold">{stats.messagesLast7d.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Últimos 30 dias</p>
                    <p className="text-3xl font-bold">{stats.messagesLast30d.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AdminGuard>
  );
}
