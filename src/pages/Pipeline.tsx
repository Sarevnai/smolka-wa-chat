import { useParams, useNavigate } from 'react-router-dom';
import { Home, ShoppingBag, Building2, Megaphone, ArrowLeft } from 'lucide-react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { KanbanBoard } from '@/components/pipeline/KanbanBoard';
import { usePipelineConversations } from '@/hooks/usePipelineConversations';
import { useDepartment } from '@/contexts/DepartmentContext';
import { useEffect } from 'react';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

const departmentConfig: Record<DepartmentType, { label: string; icon: typeof Home; color: string }> = {
  locacao: { label: 'Locação', icon: Home, color: 'bg-blue-500' },
  vendas: { label: 'Vendas', icon: ShoppingBag, color: 'bg-green-500' },
  administrativo: { label: 'Administrativo', icon: Building2, color: 'bg-orange-500' },
  marketing: { label: 'Marketing', icon: Megaphone, color: 'bg-pink-500' },
};

export default function Pipeline() {
  const { department } = useParams<{ department: string }>();
  const navigate = useNavigate();
  const { isAdmin, userDepartment } = useDepartment();

  // Validate department
  const validDepartment = department as DepartmentType;
  const isValidDepartment = ['locacao', 'vendas', 'administrativo', 'marketing'].includes(validDepartment);

  // Check access
  const hasAccess = isAdmin || userDepartment === validDepartment;

  useEffect(() => {
    if (!isValidDepartment) {
      navigate('/');
    } else if (!hasAccess) {
      navigate('/');
    }
  }, [isValidDepartment, hasAccess, navigate]);

  const { stages, loading, moveConversation } = usePipelineConversations(
    isValidDepartment && hasAccess ? validDepartment : null
  );

  if (!isValidDepartment || !hasAccess) {
    return null;
  }

  const config = departmentConfig[validDepartment];
  const Icon = config.icon;

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className={`w-10 h-10 rounded-lg ${config.color}/20 flex items-center justify-center`}>
              <Icon className={`h-5 w-5 text-${config.color.replace('bg-', '')}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pipeline - {config.label}</h1>
              <p className="text-muted-foreground">
                Gerencie as conversas do setor de {config.label.toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        <KanbanBoard 
          stages={stages} 
          loading={loading}
          onMoveConversation={moveConversation}
        />
      </div>
    </Layout>
  );
}
