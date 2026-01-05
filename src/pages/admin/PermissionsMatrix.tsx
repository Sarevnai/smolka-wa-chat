import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import Layout from '@/components/Layout';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Shield } from 'lucide-react';
import { useFunctionPermissions } from '@/hooks/admin/useFunctionPermissions';

const RESOURCES = [
  { key: 'users', label: 'Usuários', description: 'Gerenciar usuários do sistema' },
  { key: 'contacts', label: 'Contatos', description: 'Gerenciar contatos' },
  { key: 'messages', label: 'Mensagens', description: 'Enviar e visualizar mensagens' },
  { key: 'campaigns', label: 'Campanhas', description: 'Criar e gerenciar campanhas' },
  { key: 'templates', label: 'Templates', description: 'Gerenciar templates de mensagens' },
  { key: 'tickets', label: 'Tickets', description: 'Gerenciar tickets de atendimento' },
  { key: 'reports', label: 'Relatórios', description: 'Visualizar relatórios e métricas' },
  { key: 'integrations', label: 'Integrações', description: 'Configurar integrações' },
  { key: 'settings', label: 'Configurações', description: 'Configurações do sistema' }
];

const FUNCTION_INFO = {
  admin: {
    label: 'Administrador',
    color: 'bg-red-500/10 text-red-500 border-red-500/20'
  },
  manager: {
    label: 'Gerente',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
  },
  attendant: {
    label: 'Atendente',
    color: 'bg-green-500/10 text-green-500 border-green-500/20'
  },
  marketing: {
    label: 'Marketing',
    color: 'bg-pink-500/10 text-pink-500 border-pink-500/20'
  }
};

export default function PermissionsMatrix() {
  const { permissions, loading, updatePermission, getPermissionForResource } = useFunctionPermissions();

  const handlePermissionChange = async (
    userFunction: 'admin' | 'manager' | 'attendant' | 'marketing',
    resource: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    await updatePermission(userFunction, resource, field, value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Carregando permissões...</div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Matriz de Permissões</h1>
        <p className="text-muted-foreground">
          Gerencie as permissões de cada nível de acesso
        </p>
      </div>

      {/* Tabela para cada function */}
      {(['admin', 'manager', 'attendant', 'marketing'] as const).map((userFunction) => (
        <Card key={userFunction}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <Badge variant="outline" className={FUNCTION_INFO[userFunction].color}>
                {FUNCTION_INFO[userFunction].label}
              </Badge>
            </CardTitle>
            <CardDescription>
              Configure as permissões para a função {FUNCTION_INFO[userFunction].label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Recurso</TableHead>
                  <TableHead className="text-center">Visualizar</TableHead>
                  <TableHead className="text-center">Criar</TableHead>
                  <TableHead className="text-center">Editar</TableHead>
                  <TableHead className="text-center">Excluir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RESOURCES.map((resource) => {
                  const perm = getPermissionForResource(userFunction, resource.key);
                  return (
                    <TableRow key={resource.key}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{resource.label}</p>
                          <p className="text-sm text-muted-foreground">{resource.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={perm?.can_view || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(userFunction, resource.key, 'can_view', checked)
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={perm?.can_create || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(userFunction, resource.key, 'can_create', checked)
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={perm?.can_edit || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(userFunction, resource.key, 'can_edit', checked)
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={perm?.can_delete || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(userFunction, resource.key, 'can_delete', checked)
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
      </div>
    </Layout>
  );
}
