import Layout from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useDepartment } from "@/contexts/DepartmentContext";
import { AdminDashboardContent } from "@/components/dashboard/AdminDashboardContent";
import { DepartmentDashboardContent } from "@/components/dashboard/DepartmentDashboardContent";
import { NoDepartmentContent } from "@/components/dashboard/NoDepartmentContent";

const Index = () => {
  const { user } = useAuth();
  const { isAdmin, userDepartment, loading: departmentLoading } = useDepartment();
  
  // Para admin: mostrar stats gerais (sem filtro de departamento)
  // Para usuário comum: filtrar pelo seu departamento
  const effectiveDepartment = isAdmin ? null : userDepartment;
  const { stats, loading: statsLoading, refreshStats } = useDashboardStats(effectiveDepartment);

  const loading = statsLoading || departmentLoading;

  if (loading && user) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </Layout>
    );
  }


  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {user ? (
          // Dashboard dinâmico: Admin vê tudo, usuário vê só seu setor
          isAdmin ? (
            <AdminDashboardContent stats={stats} onRefresh={refreshStats} />
          ) : userDepartment ? (
            <DepartmentDashboardContent 
              department={userDepartment} 
              stats={stats} 
              onRefresh={refreshStats} 
            />
          ) : (
            // Fallback: usuário sem departamento definido
            <NoDepartmentContent />
          )
        ) : (
          <Navigate to="/auth" replace />
        )}
      </div>
    </Layout>
  );
};

export default Index;
