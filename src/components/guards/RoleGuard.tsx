import { usePermissions } from '@/hooks/usePermissions';
import { AppRole, RolePermissions } from '@/types/roles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requiredPermission?: keyof RolePermissions;
  fallback?: React.ReactNode;
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  requiredPermission,
  fallback 
}: RoleGuardProps) {
  const permissions = usePermissions();

  // Wait for loading
  if (permissions.loading) {
    return null;
  }

  // Check by role
  if (allowedRoles) {
    const hasAllowedRole = allowedRoles.some(role => permissions.hasRole(role));
    if (!hasAllowedRole) {
      return fallback || <AccessDenied />;
    }
  }

  // Check by permission
  if (requiredPermission && !permissions[requiredPermission]) {
    return fallback || <AccessDenied />;
  }

  return <>{children}</>;
}

function AccessDenied() {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Alert variant="destructive" className="max-w-md">
        <ShieldAlert className="h-5 w-5" />
        <AlertTitle>Acesso Negado</AlertTitle>
        <AlertDescription>
          Você não tem permissão para acessar esta funcionalidade.
          <br />
          Entre em contato com um administrador se precisar de acesso.
        </AlertDescription>
      </Alert>
    </div>
  );
}
