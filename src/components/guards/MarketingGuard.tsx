import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/hooks/usePermissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import Layout from "@/components/Layout";

interface MarketingGuardProps {
  children: ReactNode;
}

export function MarketingGuard({ children }: MarketingGuardProps) {
  const { isAdmin, isMarketing, loading } = usePermissions();

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Verificando permissões...</div>
        </div>
      </Layout>
    );
  }

  // Allow access for admins or users with marketing function
  if (isAdmin || isMarketing) {
    return <>{children}</>;
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar o módulo de Marketing.
            <br />
            Esta área é restrita para usuários do setor de Marketing e Administradores.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
}
