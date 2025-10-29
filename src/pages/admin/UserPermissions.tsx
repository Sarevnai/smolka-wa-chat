import { useState } from 'react';
import Layout from '@/components/Layout';
import { AdminGuard } from '@/components/guards/AdminGuard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPermissionsEditor } from '@/components/admin/UserPermissionsEditor';
import { useUserManagement, UserWithStatus } from '@/hooks/admin/useUserManagement';
import { ROLE_LABELS } from '@/types/roles';
import { Search, Settings, Shield, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserPermissions() {
  const { users, loading, refetch } = useUserManagement();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const handleEditPermissions = (user: UserWithStatus) => {
    setSelectedUser(user);
    setEditorOpen(true);
  };

  const getUserInitials = (user: UserWithStatus) => {
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user.username?.slice(0, 2).toUpperCase() || '??';
  };

  return (
    <AdminGuard>
      <Layout>
        <div className="container mx-auto py-8 px-4 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Shield className="h-8 w-8" />
                Permissões por Usuário
              </h1>
              <p className="text-muted-foreground mt-2">
                Gerencie permissões individuais de cada usuário
              </p>
            </div>
            <Button onClick={refetch} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Buscar Usuários</CardTitle>
              <CardDescription>
                Encontre um usuário para personalizar suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, usuário ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {user.full_name || user.username}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          @{user.username}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {ROLE_LABELS[user.role]}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="secondary" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => handleEditPermissions(user)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Editar Permissões
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <UserPermissionsEditor
          user={selectedUser}
          open={editorOpen}
          onOpenChange={setEditorOpen}
        />
      </Layout>
    </AdminGuard>
  );
}
