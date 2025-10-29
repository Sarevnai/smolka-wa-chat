import { usePermissions } from '@/hooks/usePermissions';
import { AppFunction, FunctionPermissions } from '@/types/functions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface FunctionGuardProps {
  children: React.ReactNode;
  allowedFunctions?: AppFunction[];
  requiredPermission?: keyof FunctionPermissions;
  fallback?: React.ReactNode;
}

export function FunctionGuard({ 
  children, 
  allowedFunctions, 
  requiredPermission,
  fallback 
}: FunctionGuardProps) {
  const permissions = usePermissions();

  // Wait for loading
  if (permissions.loading) {
    return null;
  }

  // Check by function
  if (allowedFunctions) {
    const hasAllowedFunction = allowedFunctions.some(func => permissions.hasFunction(func));
    if (!hasAllowedFunction) {
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
