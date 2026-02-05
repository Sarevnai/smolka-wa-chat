import { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useDevelopments, useUpdateDevelopment, Development } from '@/hooks/useDevelopments';
import { useDevelopmentMaterials } from '@/hooks/useDevelopmentMaterials';
import DevelopmentMaterialsModal from '@/components/admin/DevelopmentMaterialsModal';
import { Building2, MapPin, Calendar, DollarSign, Plus, Pencil, Eye, FolderOpen, Loader2, Image } from 'lucide-react';
import { toast } from 'sonner';

function formatCurrency(value: number | null): string {
  if (!value) return 'Consultar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value);
}

const statusLabels: Record<string, string> = {
  lancamento: 'Lançamento',
  em_construcao: 'Em Construção',
  pronto: 'Pronto'
};

const statusColors: Record<string, string> = {
  lancamento: 'bg-blue-500',
  em_construcao: 'bg-amber-500',
  pronto: 'bg-green-500'
};

function MaterialsCount({ developmentId }: { developmentId: string }) {
  const { data: materials } = useDevelopmentMaterials(developmentId);
  const count = materials?.length || 0;
  return (
    <span className="text-xs text-muted-foreground">
      {count} {count === 1 ? 'material' : 'materiais'}
    </span>
  );
}

function HeroImagePreview({ development }: { development: Development }) {
  if (!development.hero_image) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Image className="h-3 w-3" />
        <span>Sem foto de capa</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <img 
        src={development.hero_image} 
        alt={`Capa ${development.name}`}
        className="h-8 w-12 object-cover rounded border"
      />
      <span className="text-xs text-green-600">✓ Foto de capa</span>
    </div>
  );
}

export default function DevelopmentsManagement() {
  const { data: developments, isLoading } = useDevelopments();
  const updateDevelopment = useUpdateDevelopment();
  const [selectedDevelopment, setSelectedDevelopment] = useState<Development | null>(null);
  const [materialsModalOpen, setMaterialsModalOpen] = useState(false);

  const handleOpenMaterials = (dev: Development) => {
    setSelectedDevelopment(dev);
    setMaterialsModalOpen(true);
  };

  const handleToggleActive = async (dev: Development) => {
    try {
      await updateDevelopment.mutateAsync({
        id: dev.id,
        is_active: !dev.is_active
      });
      toast.success(`${dev.name} ${!dev.is_active ? 'ativado' : 'desativado'}`);
    } catch (error) {
      toast.error('Erro ao atualizar empreendimento');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Empreendimentos</h1>
            <p className="text-muted-foreground">
              Gerencie os empreendimentos para atendimento da Aimee de Vendas
            </p>
          </div>
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            Novo Empreendimento
          </Button>
        </div>

        {!developments?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum empreendimento cadastrado</h3>
              <p className="text-muted-foreground text-sm">
                Adicione empreendimentos para a Aimee de Vendas atender leads de landing pages
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {developments.map((dev) => (
              <Card key={dev.id} className={!dev.is_active ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{dev.name}</CardTitle>
                      <CardDescription>{dev.developer}</CardDescription>
                    </div>
                    <Badge className={statusColors[dev.status] || 'bg-gray-500'}>
                      {statusLabels[dev.status] || dev.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{dev.neighborhood}, {dev.city}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>A partir de {formatCurrency(dev.starting_price)}</span>
                    </div>
                    {dev.delivery_date && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Entrega: {dev.delivery_date}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {dev.unit_types.slice(0, 3).map((unit, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {unit.tipo}
                      </Badge>
                    ))}
                    {dev.unit_types.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{dev.unit_types.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={dev.is_active}
                        onCheckedChange={() => handleToggleActive(dev)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {dev.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenMaterials(dev)}
                        title="Materiais"
                      >
                        <FolderOpen className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="pt-2 space-y-1">
                    <HeroImagePreview development={dev} />
                    <MaterialsCount developmentId={dev.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DevelopmentMaterialsModal
          development={selectedDevelopment}
          open={materialsModalOpen}
          onOpenChange={setMaterialsModalOpen}
        />
      </div>
    </Layout>
  );
}
