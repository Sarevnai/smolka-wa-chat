import Layout from '@/components/Layout';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { useUserManagement } from '@/hooks/admin/useUserManagement';
import { UserCard } from '@/components/admin/UserCard';
import { CreateUserModal } from '@/components/admin/CreateUserModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, RefreshCw, Filter, UserPlus } from 'lucide-react';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FUNCTION_LABELS } from '@/types/functions';

export default function UserManagement() {
  const {
    users,
    loading,
    creating,
    refetch,
    createUser,
    updateUserFunction,
    removeUserFunction,
    toggleUserStatus,
    blockUser,
    unblockUser,
    deleteUser,
  } = useUserManagement();

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [functionFilter, setFunctionFilter] = useState<'all' | 'admin' | 'manager' | 'attendant' | 'marketing' | 'none'>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredUsers = users.filter(user => {
    // Status filter
    if (statusFilter === 'active' && (!user.is_active || user.is_blocked)) return false;
    if (statusFilter === 'inactive' && user.is_active) return false;
    if (statusFilter === 'blocked' && !user.is_blocked) return false;

    // Function filter
    if (functionFilter === 'none' && user.function !== null) return false;
    if (functionFilter !== 'all' && functionFilter !== 'none' && user.function !== functionFilter) return false;

    return true;
  });

  const handleCreateUser = async (data: {
    email: string;
    full_name: string;
    password: string;
    function?: 'admin' | 'manager' | 'attendant' | 'marketing';
    department_code?: string;
  }) => {
    await createUser(data);
    setCreateModalOpen(false);
  };

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
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
              <Button variant="outline" size="sm" onClick={refetch} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
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
                  <label className="text-sm font-medium mb-2 block">Função</label>
                  <Select value={functionFilter} onValueChange={(v: any) => setFunctionFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="admin">{FUNCTION_LABELS.admin}</SelectItem>
                      <SelectItem value="manager">{FUNCTION_LABELS.manager}</SelectItem>
                      <SelectItem value="attendant">{FUNCTION_LABELS.attendant}</SelectItem>
                      <SelectItem value="marketing">{FUNCTION_LABELS.marketing}</SelectItem>
                      <SelectItem value="none">Sem Função</SelectItem>
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
                  onUpdateFunction={updateUserFunction}
                  onRemoveFunction={removeUserFunction}
                  onToggleStatus={toggleUserStatus}
                  onBlock={blockUser}
                  onUnblock={unblockUser}
                  onDelete={deleteUser}
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
              <div className="flex items-center gap-3">
                <Badge className="bg-pink-500/10 text-pink-500 border-pink-500/20">Marketing</Badge>
                <span className="text-sm text-muted-foreground">
                  Acesso ao setor de Marketing com permissões para campanhas
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <CreateUserModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onCreateUser={handleCreateUser}
          isLoading={creating}
        />
      </Layout>
    </AdminGuard>
  );
}
