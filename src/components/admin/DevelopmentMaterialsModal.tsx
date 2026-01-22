import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDevelopmentMaterials, useDeleteMaterial, MATERIAL_TYPE_LABELS, MaterialType } from '@/hooks/useDevelopmentMaterials';
import { Development } from '@/hooks/useDevelopments';
import UploadMaterialForm from './UploadMaterialForm';
import { Plus, Trash2, Star, FileImage, FileVideo, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DevelopmentMaterialsModalProps {
  development: Development | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DevelopmentMaterialsModal({ 
  development, 
  open, 
  onOpenChange 
}: DevelopmentMaterialsModalProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: materials, isLoading } = useDevelopmentMaterials(development?.id || null);
  const deleteMaterial = useDeleteMaterial();

  const handleDelete = async () => {
    if (!deleteId || !development) return;
    
    try {
      await deleteMaterial.mutateAsync({ id: deleteId, development_id: development.id });
      toast.success('Material removido');
      setDeleteId(null);
    } catch (error) {
      toast.error('Erro ao remover material');
    }
  };

  const getIcon = (type: string) => {
    if (type === 'video') return <FileVideo className="h-5 w-5" />;
    if (type === 'documento') return <FileText className="h-5 w-5" />;
    return <FileImage className="h-5 w-5" />;
  };

  const getTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      planta: 'bg-blue-500/10 text-blue-500',
      perspectiva: 'bg-purple-500/10 text-purple-500',
      video: 'bg-red-500/10 text-red-500',
      documento: 'bg-amber-500/10 text-amber-500',
      foto: 'bg-green-500/10 text-green-500'
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  if (!development) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Materiais - {development.name}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {showUploadForm ? (
              <UploadMaterialForm
                developmentId={development.id}
                onSuccess={() => setShowUploadForm(false)}
                onCancel={() => setShowUploadForm(false)}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {materials?.length || 0} materiais cadastrados
                  </p>
                  <Button onClick={() => setShowUploadForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Material
                  </Button>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : !materials?.length ? (
                  <div className="text-center py-12 border rounded-lg border-dashed">
                    <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium">Nenhum material cadastrado</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Adicione plantas, perspectivas e outros materiais para a IA usar no atendimento
                    </p>
                    <Button className="mt-4" onClick={() => setShowUploadForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Material
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <div
                        key={material.id}
                        className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {/* Preview */}
                        {material.file_type?.startsWith('image/') ? (
                          <img
                            src={material.file_url}
                            alt={material.title}
                            className="h-16 w-16 object-cover rounded"
                          />
                        ) : (
                          <div className="h-16 w-16 bg-muted rounded flex items-center justify-center">
                            {getIcon(material.material_type)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{material.title}</h4>
                            {material.is_featured && (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                          {material.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {material.description}
                            </p>
                          )}
                          <Badge variant="secondary" className={`mt-1 ${getTypeColor(material.material_type)}`}>
                            {MATERIAL_TYPE_LABELS[material.material_type as MaterialType] || material.material_type}
                          </Badge>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover material?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O material será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
