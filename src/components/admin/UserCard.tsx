import { UserWithStatus } from '@/hooks/admin/useUserManagement';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FUNCTION_LABELS } from '@/types/functions';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserActionsMenu } from './UserActionsMenu';

interface UserCardProps {
  user: UserWithStatus;
  onUpdateFunction: (userId: string, newFunction: any) => void;
  onToggleStatus: (userId: string, isActive: boolean) => void;
  onBlock: (userId: string, reason: string) => void;
  onUnblock: (userId: string) => void;
}

export function UserCard({ user, onUpdateFunction, onToggleStatus, onBlock, onUnblock }: UserCardProps) {
  const getInitials = (name: string | null, username: string) => {
    if (name) {
      const parts = name.split(' ');
      return parts.length > 1
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'manager':
        return 'secondary';
      case 'attendant':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {getInitials(user.full_name, user.username)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">
                  {user.full_name || user.username}
                </h3>
                {!user.is_active && (
                  <Badge variant="destructive" className="text-xs">
                    Inativo
                  </Badge>
                )}
                {user.is_blocked && (
                  <Badge variant="destructive" className="text-xs">
                    Bloqueado
                  </Badge>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">Código: #{user.user_code}</p>
              </div>

              <div className="flex items-center gap-2 mt-3">
                <Badge variant={getRoleBadgeVariant(user.function)}>
                  {user.function ? FUNCTION_LABELS[user.function] : 'Sem função'}
                </Badge>
                {user.last_login && (
                  <span className="text-xs text-muted-foreground">
                    Último acesso:{' '}
                    {formatDistanceToNow(new Date(user.last_login), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>

              {user.blocked_reason && (
                <p className="text-xs text-destructive mt-2">
                  Motivo do bloqueio: {user.blocked_reason}
                </p>
              )}
            </div>
          </div>

          <UserActionsMenu
            user={user}
            onUpdateFunction={onUpdateFunction}
            onToggleStatus={onToggleStatus}
            onBlock={onBlock}
            onUnblock={onUnblock}
          />
        </div>
      </CardContent>
    </Card>
  );
}
