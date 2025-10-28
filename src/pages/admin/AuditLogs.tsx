import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Layout from '@/components/Layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ActivityLogTable } from '@/components/admin/ActivityLogTable';
import {
  useActivityLogs,
  useActionTypes,
  useTargetTables,
  LogFilters,
} from '@/hooks/admin/useActivityLogs';
import { Search, RefreshCw, Filter, X } from 'lucide-react';
import { useUserManagement } from '@/hooks/admin/useUserManagement';

export default function AuditLogs() {
  const [filters, setFilters] = useState<LogFilters>({});
  const { logs, loading, refetch, totalCount } = useActivityLogs(filters);
  const actionTypes = useActionTypes();
  const targetTables = useTargetTables();
  const { users } = useUserManagement();

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Logs de Auditoria</h1>
        <p className="text-muted-foreground">
          Acompanhe todas as ações realizadas no sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>
                Filtre os logs por usuário, ação, período ou tabela
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar Filtros
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar em logs..."
                  className="pl-10"
                  value={filters.searchTerm || ''}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user">Usuário</Label>
              <Select
                value={filters.userId || 'all'}
                onValueChange={(value) => handleFilterChange('userId', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="user">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.full_name || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Tipo de Ação</Label>
              <Select
                value={filters.actionType || 'all'}
                onValueChange={(value) => handleFilterChange('actionType', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {actionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="table">Tabela</Label>
              <Select
                value={filters.targetTable || 'all'}
                onValueChange={(value) => handleFilterChange('targetTable', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="table">
                  <SelectValue placeholder="Todas as tabelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tabelas</SelectItem>
                  {targetTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Inicial</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Final</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Logs de Atividade
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({totalCount} {totalCount === 1 ? 'registro' : 'registros'})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Histórico completo de ações realizadas por todos os usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityLogTable logs={logs} loading={loading} />
        </CardContent>
      </Card>
      </div>
    </Layout>
  );
}
