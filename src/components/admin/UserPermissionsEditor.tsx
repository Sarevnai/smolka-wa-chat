import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useUserPermissions } from '@/hooks/admin/useUserPermissions';
import { FUNCTION_LABELS } from '@/types/functions';
import { RefreshCw, Shield, Info } from 'lucide-react';
import { UserWithStatus } from '@/hooks/admin/useUserManagement';
import { toast } from 'sonner';

interface UserPermissionsEditorProps {
  user: UserWithStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RESOURCES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visão geral e métricas' },
  { key: 'chats', label: 'Conversas', description: 'Acesso às conversas do WhatsApp' },
  { key: 'contacts', label: 'Contatos', description: 'Gerenciamento de contatos' },
  { key: 'campaigns', label: 'Campanhas', description: 'Envio de campanhas em massa' },
  { key: 'reports', label: 'Relatórios', description: 'Visualização de relatórios' },
  { key: 'financial_reports', label: 'Relatórios Financeiros', description: 'Relatórios financeiros detalhados' },
  { key: 'integrations', label: 'Integrações', description: 'Gerenciar integrações' },
  { key: 'tickets', label: 'Tickets', description: 'Sistema de tickets' },
  { key: 'users', label: 'Usuários', description: 'Gerenciamento de usuários' },
  { key: 'settings', label: 'Configurações', description: 'Configurações do sistema' },
];

const PERMISSION_TYPES = [
  { key: 'can_view', label: 'Visualizar', color: 'bg-blue-500' },
  { key: 'can_create', label: 'Criar', color: 'bg-green-500' },
  { key: 'can_edit', label: 'Editar', color: 'bg-yellow-500' },
  { key: 'can_delete', label: 'Excluir', color: 'bg-red-500' },
] as const;

export function UserPermissionsEditor({ user, open, onOpenChange }: UserPermissionsEditorProps) {
  const { effectivePermissions, loading, setUserPermission, resetToRoleDefaults } = 
    useUserPermissions(user?.user_id); // Fixed: using user_id from auth.users instead of profiles.id
  const [resetting, setResetting] = useState(false);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});

  const handleResetAll = async () => {
    setResetting(true);
    await resetToRoleDefaults();
    toast.success('Todas as permissões resetadas');
    setResetting(false);
  };

  const handleResetResource = async (resource: string) => {
    await resetToRoleDefaults(resource);
  };

  const handlePermissionChange = async (
    resource: string,
    field: typeof PERMISSION_TYPES[number]['key'],
    checked: boolean
  ) => {
    const key = `${resource}_${field}`;
    setSavingStates(prev => ({ ...prev, [key]: true }));
    
    await setUserPermission(resource, field, checked);
    
    setSavingStates(prev => ({ ...prev, [key]: false }));
  };

  const getPermissionForResource = (resource: string) => {
    return effectivePermissions.find(p => p.resource === resource);
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de {user.full_name || user.username}
          </SheetTitle>
          <SheetDescription>
            Função: <Badge variant="outline">{FUNCTION_LABELS[user.function]}</Badge>
            <br />
            Personalize as permissões individuais deste usuário
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Permissões personalizadas sobrescrevem as permissões padrão do cargo.
              Use o botão de reset para voltar aos padrões.
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetAll}
              disabled={loading || resetting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
              Resetar Todas
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6 pr-4">
              {RESOURCES.map((resource) => {
                const permission = getPermissionForResource(resource.key);
                
                return (
                  <div key={resource.key} className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{resource.label}</h4>
                          {permission?.is_custom && (
                            <Badge variant="secondary" className="text-xs">
                              Personalizado
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {resource.description}
                        </p>
                      </div>
                      {permission?.is_custom && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetResource(resource.key)}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {PERMISSION_TYPES.map((type) => (
                        <div
                          key={type.key}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <span className="text-sm font-medium">{type.label}</span>
                          <Switch
                            checked={permission?.[type.key] || false}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(resource.key, type.key, checked)
                            }
                            disabled={loading || savingStates[`${resource.key}_${type.key}`]}
                          />
                        </div>
                      ))}
                    </div>

                    <Separator />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
