import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Trash2, 
  Copy, 
  Check,
  FileText
} from 'lucide-react';
import { AIFlow } from '@/types/flow';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface FlowListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flows: AIFlow[];
  isLoading: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onNew: () => void;
}

export function FlowListModal({
  open,
  onOpenChange,
  flows,
  isLoading,
  onSelect,
  onDelete,
  onDuplicate,
  onNew,
}: FlowListModalProps) {
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredFlows = flows.filter(flow => 
    flow.name.toLowerCase().includes(search.toLowerCase()) ||
    flow.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getDepartmentLabel = (dept: AIFlow['department']) => {
    const labels: Record<AIFlow['department'], string> = {
      locacao: 'Locação',
      vendas: 'Vendas',
      administrativo: 'Administrativo',
      marketing: 'Marketing',
    };
    return labels[dept];
  };

  const getDepartmentColor = (dept: AIFlow['department']) => {
    const colors: Record<AIFlow['department'], string> = {
      locacao: 'bg-blue-500',
      vendas: 'bg-green-500',
      administrativo: 'bg-purple-500',
      marketing: 'bg-orange-500',
    };
    return colors[dept];
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Meus Fluxos</DialogTitle>
            <DialogDescription>
              Selecione um fluxo para editar ou crie um novo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar fluxos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={onNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Carregando...</p>
                </div>
              ) : filteredFlows.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    {search ? 'Nenhum fluxo encontrado' : 'Nenhum fluxo criado ainda'}
                  </p>
                  <Button variant="link" onClick={onNew}>
                    Criar primeiro fluxo
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFlows.map((flow) => (
                    <div
                      key={flow.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between">
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            onSelect(flow.id);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{flow.name}</h4>
                            {flow.isActive && (
                              <Badge variant="default" className="gap-1">
                                <Check className="h-3 w-3" />
                                Ativo
                              </Badge>
                            )}
                          </div>
                          {flow.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {flow.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge 
                              variant="secondary" 
                              className={`text-white ${getDepartmentColor(flow.department)}`}
                            >
                              {getDepartmentLabel(flow.department)}
                            </Badge>
                            <span>•</span>
                            <span>{flow.nodes.length} nós</span>
                            <span>•</span>
                            <span>
                              Atualizado {formatDistanceToNow(new Date(flow.updatedAt), { 
                                addSuffix: true,
                                locale: ptBR 
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicate(flow.id);
                            }}
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(flow.id);
                            }}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fluxo será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
