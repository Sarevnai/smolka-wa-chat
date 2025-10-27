import { usePermissions } from '@/hooks/usePermissions';
import { Navigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const permissions = usePermissions();

  // Wait for loading
  if (permissions.loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Verificando permissões...</div>
      </div>
    );
  }

  // Check if user is admin
  if (!permissions.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Acesso Administrativo Negado</AlertTitle>
          <AlertDescription>
            Esta área é restrita a administradores do sistema.
            <br />
            Entre em contato com Ian Veras se precisar de acesso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
