import { UserWithStatus } from '@/hooks/admin/useUserManagement';
import { AppFunction, FUNCTION_LABELS } from '@/types/functions';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Shield, UserCheck, UserX, Ban, Unlock, UserMinus, Trash2, Key } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface UserActionsMenuProps {
  user: UserWithStatus;
  onUpdateFunction: (userId: string, newFunction: AppFunction) => void;
  onRemoveFunction: (userId: string) => void;
  onToggleStatus: (userId: string, isActive: boolean) => void;
  onBlock: (userId: string, reason: string) => void;
  onUnblock: (userId: string) => void;
  onDelete: (userId: string) => void;
  onResetPassword: (userId: string) => void;
}

export function UserActionsMenu({
  user,
  onUpdateFunction,
  onRemoveFunction,
  onToggleStatus,
  onBlock,
  onUnblock,
  onDelete,
  onResetPassword,
}: UserActionsMenuProps) {
  const [blockReason, setBlockReason] = useState('');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Ações do Usuário</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Alterar Function */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Shield className="mr-2 h-4 w-4" />
            Alterar Função
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onUpdateFunction(user.user_id, 'admin')}>
              {FUNCTION_LABELS.admin}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateFunction(user.user_id, 'manager')}>
              {FUNCTION_LABELS.manager}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateFunction(user.user_id, 'attendant')}>
              {FUNCTION_LABELS.attendant}
            </DropdownMenuItem>
            {user.function && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onRemoveFunction(user.user_id)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Remover Função
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Redefinir Senha */}
        <DropdownMenuItem onClick={() => onResetPassword(user.user_id)}>
          <Key className="mr-2 h-4 w-4" />
          Redefinir Senha
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Ativar/Desativar */}
        {user.is_active ? (
          <DropdownMenuItem onClick={() => onToggleStatus(user.user_id, false)}>
            <UserX className="mr-2 h-4 w-4" />
            Desativar Usuário
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onToggleStatus(user.user_id, true)}>
            <UserCheck className="mr-2 h-4 w-4" />
            Ativar Usuário
          </DropdownMenuItem>
        )}

        {/* Bloquear/Desbloquear */}
        {user.is_blocked ? (
          <DropdownMenuItem onClick={() => onUnblock(user.user_id)}>
            <Unlock className="mr-2 h-4 w-4" />
            Desbloquear
          </DropdownMenuItem>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Ban className="mr-2 h-4 w-4" />
                Bloquear Usuário
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Bloquear Usuário</AlertDialogTitle>
                <AlertDialogDescription>
                  Informe o motivo do bloqueio. O usuário não poderá acessar o sistema até ser
                  desbloqueado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="block-reason">Motivo do Bloqueio</Label>
                <Input
                  id="block-reason"
                  placeholder="Ex: Violação de políticas de uso"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onBlock(user.user_id, blockReason);
                    setBlockReason('');
                  }}
                  disabled={!blockReason}
                >
                  Bloquear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <DropdownMenuSeparator />

        {/* Excluir Usuário */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Usuário
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o usuário <strong>{user.full_name || user.username}</strong>? 
                Esta ação é irreversível e todos os dados do usuário serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(user.user_id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}