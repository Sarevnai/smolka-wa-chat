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
import { MoreVertical, Shield, UserCheck, UserX, Ban, Unlock } from 'lucide-react';
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
  onToggleStatus: (userId: string, isActive: boolean) => void;
  onBlock: (userId: string, reason: string) => void;
  onUnblock: (userId: string) => void;
}

export function UserActionsMenu({
  user,
  onUpdateFunction,
  onToggleStatus,
  onBlock,
  onUnblock,
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
          </DropdownMenuSubContent>
        </DropdownMenuSub>

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
