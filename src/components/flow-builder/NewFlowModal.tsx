import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileCheck, Users, HelpCircle, Calendar, Sparkles } from 'lucide-react';
import { AIFlow, CustomFlowNode, CustomFlowEdge } from '@/types/flow';
import { FLOW_TEMPLATES, FlowTemplate } from '@/lib/flowTemplates';

interface NewFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { 
    name: string; 
    description?: string; 
    department: AIFlow['department'];
    nodes?: CustomFlowNode[];
    edges?: CustomFlowEdge[];
  }) => void;
  isLoading?: boolean;
}

const categoryIcons: Record<FlowTemplate['category'], React.ReactNode> = {
  confirmacao: <FileCheck className="h-4 w-4" />,
  qualificacao: <Users className="h-4 w-4" />,
  atendimento: <HelpCircle className="h-4 w-4" />,
  vendas: <Calendar className="h-4 w-4" />
};

const categoryLabels: Record<FlowTemplate['category'], string> = {
  confirmacao: 'Confirmação',
  qualificacao: 'Qualificação',
  atendimento: 'Atendimento',
  vendas: 'Vendas'
};

export function NewFlowModal({ open, onOpenChange, onConfirm, isLoading }: NewFlowModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState<AIFlow['department']>('marketing');
  const [selectedTemplate, setSelectedTemplate] = useState<FlowTemplate | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onConfirm({
      name: name.trim(),
      description: description.trim() || undefined,
      department,
      nodes: selectedTemplate?.nodes,
      edges: selectedTemplate?.edges
    });

    // Reset form
    setName('');
    setDescription('');
    setDepartment('marketing');
    setSelectedTemplate(null);
  };

  const handleSelectTemplate = (template: FlowTemplate) => {
    setSelectedTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setDepartment(template.department);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Novo Fluxo</DialogTitle>
          <DialogDescription>
            Crie um fluxo do zero ou use um template pré-definido
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="blank" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="blank">Em Branco</TabsTrigger>
            <TabsTrigger value="template" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="blank" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Fluxo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Confirmação de Imóvel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o objetivo deste fluxo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Select value={department} onValueChange={(v) => setDepartment(v as AIFlow['department'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locacao">Locação</SelectItem>
                    <SelectItem value="vendas">Vendas</SelectItem>
                    <SelectItem value="administrativo">Administrativo</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!name.trim() || isLoading}>
                  {isLoading ? 'Criando...' : 'Criar Fluxo'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="template" className="mt-4">
            <ScrollArea className="h-[300px] pr-4">
              <div className="grid gap-3">
                {FLOW_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSelectTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded bg-muted">
                        {categoryIcons[template.category]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[template.category]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {template.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.nodes.length} nós • {template.edges.length} conexões
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedTemplate && (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome do Fluxo *</Label>
                  <Input
                    id="template-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-department">Departamento</Label>
                  <Select value={department} onValueChange={(v) => setDepartment(v as AIFlow['department'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locacao">Locação</SelectItem>
                      <SelectItem value="vendas">Vendas</SelectItem>
                      <SelectItem value="administrativo">Administrativo</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Criando...' : 'Criar com Template'}
                  </Button>
                </div>
              </form>
            )}

            {!selectedTemplate && (
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
