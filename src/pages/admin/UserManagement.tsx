import Layout from '@/components/Layout';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { useUserManagement } from '@/hooks/admin/useUserManagement';
import { UserCard } from '@/components/admin/UserCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, RefreshCw, Filter } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ROLE_LABELS } from '@/types/roles';

export default function UserManagement() {
  const {
    users,
    loading,
    refetch,
    updateUserRole,
    toggleUserStatus,
    blockUser,
    unblockUser,
  } = useUserManagement();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'manager' | 'attendant' | 'none'>('all');

  const filteredUsers = users.filter(user => {
    // Status filter
    if (statusFilter === 'active' && (!user.is_active || user.is_blocked)) return false;
    if (statusFilter === 'inactive' && user.is_active) return false;
    if (statusFilter === 'blocked' && !user.is_blocked) return false;

    // Role filter
    if (roleFilter === 'none' && user.role !== null) return false;
    if (roleFilter !== 'all' && roleFilter !== 'none' && user.role !== roleFilter) return false;

    return true;
  });

  return (
    <AdminGuard>
      <Layout>
        <div className="space-y-6 p-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                  Gerencie usuários, permissões e acessos ao sistema
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Filtre usuários por status e permissão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                      <SelectItem value="blocked">Bloqueados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Permissão</label>
                  <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                      <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                      <SelectItem value="attendant">{ROLE_LABELS.attendant}</SelectItem>
                      <SelectItem value="none">Sem Permissão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Mostrando {filteredUsers.length} de {users.length} usuários
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Usuários */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Carregando usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhum usuário encontrado com os filtros selecionados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  onUpdateRole={updateUserRole}
                  onToggleStatus={toggleUserStatus}
                  onBlock={blockUser}
                  onUnblock={unblockUser}
                />
              ))}
            </div>
          )}

          {/* Legenda */}
          <Card>
            <CardHeader>
              <CardTitle>Níveis de Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge>Administrador</Badge>
                <span className="text-sm text-muted-foreground">
                  Acesso total à plataforma, incluindo configurações e gerenciamento de usuários
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Gerente</Badge>
                <span className="text-sm text-muted-foreground">
                  Acesso a dados operacionais, relatórios e visualização de tickets
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">Atendente</Badge>
                <span className="text-sm text-muted-foreground">
                  Acesso restrito ao módulo de atendimento e visualização de contatos
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </AdminGuard>
  );
}
