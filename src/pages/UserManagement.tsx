import { useState, useEffect } from 'react';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, ROLE_LABELS } from '@/types/roles';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/Layout';
import { Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole | null;
}

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name');

      if (profilesError) throw profilesError;

      // Buscar emails via RPC ou direct query
      const userIds = profiles?.map(p => p.user_id) || [];
      
      // Fetch auth emails for each user (fallback to profiles if admin API not available)
      const emailPromises = userIds.map(async (userId) => {
        const { data } = await supabase.auth.admin.getUserById(userId);
        return { id: userId, email: data.user?.email || 'N/A' };
      });
      
      const emailResults = await Promise.all(emailPromises);
      
      // Buscar roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combinar dados
      const combinedUsers: UserWithRole[] = profiles?.map(profile => {
        const emailData = emailResults.find(e => e.id === profile.user_id);
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        
        return {
          id: profile.user_id,
          email: emailData?.email || 'N/A',
          full_name: profile.full_name,
          role: userRole?.role as AppRole || null,
        };
      }) || [];

      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: AppRole) => {
    try {
      // Remove role antiga
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Adiciona nova role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      toast({
        title: "Permissão atualizada",
        description: `Usuário agora é ${ROLE_LABELS[newRole]}`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Erro ao atualizar permissão",
        description: "Não foi possível atualizar a permissão do usuário.",
        variant: "destructive",
      });
    }
  };

  return (
    <RoleGuard allowedRoles={['admin']}>
      <Layout>
        <div className="space-y-6 p-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
              <p className="text-muted-foreground">
                Gerencie permissões e níveis de acesso dos usuários
              </p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuários e Permissões
              </CardTitle>
              <CardDescription>
                Atribua roles para controlar o acesso de cada usuário à plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Carregando usuários...</p>
              ) : users.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Permissão Atual</TableHead>
                      <TableHead>Alterar Permissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.full_name || 'Sem nome'}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.role ? (
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {ROLE_LABELS[user.role]}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Sem permissão</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role || ''}
                            onValueChange={(role) => handleChangeRole(user.id, role as AppRole)}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue placeholder="Selecionar permissão" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                {ROLE_LABELS.admin}
                              </SelectItem>
                              <SelectItem value="manager">
                                {ROLE_LABELS.manager}
                              </SelectItem>
                              <SelectItem value="attendant">
                                {ROLE_LABELS.attendant}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Níveis de Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>Administrador</Badge>
                  <span className="text-sm text-muted-foreground">
                    Acesso total à plataforma, incluindo configurações e gerenciamento de usuários
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Gerente</Badge>
                  <span className="text-sm text-muted-foreground">
                    Acesso a todos os dados operacionais, exceto configurações sensíveis
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Atendente</Badge>
                  <span className="text-sm text-muted-foreground">
                    Acesso restrito ao módulo de atendimento e visualização de contatos
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    </RoleGuard>
  );
}
