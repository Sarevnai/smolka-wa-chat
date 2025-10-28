import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Check, X, Shield, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Permission {
  category: string;
  name: string;
  admin: boolean;
  manager: boolean;
  attendant: boolean;
}

const permissions: Permission[] = [
  // Dashboard
  { category: 'Dashboard', name: 'Ver Dashboard', admin: true, manager: true, attendant: false },
  { category: 'Dashboard', name: 'Ver Métricas Financeiras', admin: true, manager: false, attendant: false },
  
  // Conversas
  { category: 'Conversas', name: 'Ver Conversas', admin: true, manager: true, attendant: true },
  { category: 'Conversas', name: 'Enviar Mensagens', admin: true, manager: true, attendant: true },
  { category: 'Conversas', name: 'Deletar Mensagens', admin: true, manager: false, attendant: false },
  { category: 'Conversas', name: 'Restaurar Mensagens', admin: true, manager: false, attendant: false },
  
  // Contatos
  { category: 'Contatos', name: 'Ver Contatos', admin: true, manager: true, attendant: true },
  { category: 'Contatos', name: 'Criar Contatos', admin: true, manager: true, attendant: false },
  { category: 'Contatos', name: 'Editar Contatos', admin: true, manager: true, attendant: false },
  { category: 'Contatos', name: 'Deletar Contatos', admin: true, manager: false, attendant: false },
  { category: 'Contatos', name: 'Importar Contatos', admin: true, manager: false, attendant: false },
  { category: 'Contatos', name: 'Exportar Contatos', admin: true, manager: true, attendant: false },
  
  // Tickets
  { category: 'Tickets', name: 'Ver Todos os Tickets', admin: true, manager: true, attendant: false },
  { category: 'Tickets', name: 'Ver Tickets Atribuídos', admin: true, manager: true, attendant: true },
  { category: 'Tickets', name: 'Criar Tickets', admin: true, manager: true, attendant: true },
  { category: 'Tickets', name: 'Editar Tickets', admin: true, manager: true, attendant: false },
  { category: 'Tickets', name: 'Deletar Tickets', admin: true, manager: false, attendant: false },
  { category: 'Tickets', name: 'Atribuir Tickets', admin: true, manager: true, attendant: false },
  
  // Campanhas
  { category: 'Campanhas', name: 'Ver Campanhas', admin: true, manager: true, attendant: false },
  { category: 'Campanhas', name: 'Criar Campanhas', admin: true, manager: false, attendant: false },
  { category: 'Campanhas', name: 'Editar Campanhas', admin: true, manager: false, attendant: false },
  { category: 'Campanhas', name: 'Enviar Campanhas', admin: true, manager: false, attendant: false },
  { category: 'Campanhas', name: 'Deletar Campanhas', admin: true, manager: false, attendant: false },
  
  // Relatórios
  { category: 'Relatórios', name: 'Ver Relatórios Básicos', admin: true, manager: true, attendant: false },
  { category: 'Relatórios', name: 'Ver Relatórios Financeiros', admin: true, manager: false, attendant: false },
  { category: 'Relatórios', name: 'Exportar Relatórios', admin: true, manager: true, attendant: false },
  
  // Integrações
  { category: 'Integrações', name: 'Ver Integrações', admin: true, manager: false, attendant: false },
  { category: 'Integrações', name: 'Configurar Integrações', admin: true, manager: false, attendant: false },
  { category: 'Integrações', name: 'ClickUp - Criar Tarefas', admin: true, manager: false, attendant: false },
  
  // Templates
  { category: 'Templates', name: 'Ver Templates', admin: true, manager: true, attendant: true },
  { category: 'Templates', name: 'Criar Templates', admin: true, manager: false, attendant: false },
  { category: 'Templates', name: 'Editar Templates', admin: true, manager: false, attendant: false },
  { category: 'Templates', name: 'Deletar Templates', admin: true, manager: false, attendant: false },
  
  // Administração
  { category: 'Administração', name: 'Acessar Painel Admin', admin: true, manager: false, attendant: false },
  { category: 'Administração', name: 'Gerenciar Usuários', admin: true, manager: false, attendant: false },
  { category: 'Administração', name: 'Alterar Roles', admin: true, manager: false, attendant: false },
  { category: 'Administração', name: 'Bloquear Usuários', admin: true, manager: false, attendant: false },
  { category: 'Administração', name: 'Ver Logs de Auditoria', admin: true, manager: false, attendant: false },
  { category: 'Administração', name: 'Ver Configurações', admin: true, manager: false, attendant: false },
];

const RoleIcon = ({ role }: { role: string }) => {
  const colors = {
    admin: 'bg-red-500/10 text-red-500 border-red-500/20',
    manager: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    attendant: 'bg-green-500/10 text-green-500 border-green-500/20',
  };
  
  return (
    <Badge variant="outline" className={colors[role as keyof typeof colors]}>
      {role === 'admin' && '🔴 Admin'}
      {role === 'manager' && '🟡 Manager'}
      {role === 'attendant' && '🟢 Atendente'}
    </Badge>
  );
};

export default function PermissionsMatrix() {
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Matriz de Permissões</h1>
        <p className="text-muted-foreground">
          Visualize as permissões de cada role no sistema
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Visualização Apenas</AlertTitle>
        <AlertDescription>
          Esta é uma visualização das permissões atuais do sistema. A edição de permissões
          será implementada em uma versão futura.
        </AlertDescription>
      </Alert>

      {Object.entries(groupedPermissions).map(([category, perms]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {category}
            </CardTitle>
            <CardDescription>
              Permissões da categoria {category.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Permissão</TableHead>
                    <TableHead className="text-center w-[20%]">
                      <div className="flex items-center justify-center">
                        <RoleIcon role="admin" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[20%]">
                      <div className="flex items-center justify-center">
                        <RoleIcon role="manager" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[20%]">
                      <div className="flex items-center justify-center">
                        <RoleIcon role="attendant" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((perm) => (
                    <TableRow key={perm.name}>
                      <TableCell className="font-medium">{perm.name}</TableCell>
                      <TableCell className="text-center">
                        {perm.admin ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.manager ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {perm.attendant ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
