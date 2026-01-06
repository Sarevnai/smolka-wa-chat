import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileCheck, 
  Users, 
  HelpCircle, 
  Calendar,
  ArrowRight,
  Home
} from 'lucide-react';
import { FLOW_TEMPLATES, FlowTemplate } from '@/lib/flowTemplates';

interface TemplatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: FlowTemplate) => void;
}

const categoryIcons: Record<FlowTemplate['category'], React.ReactNode> = {
  confirmacao: <FileCheck className="h-5 w-5" />,
  qualificacao: <Users className="h-5 w-5" />,
  atendimento: <HelpCircle className="h-5 w-5" />,
  vendas: <Calendar className="h-5 w-5" />,
  proprietarios: <Home className="h-5 w-5" />
};

const categoryLabels: Record<FlowTemplate['category'], string> = {
  confirmacao: 'Confirmação',
  qualificacao: 'Qualificação',
  atendimento: 'Atendimento',
  vendas: 'Vendas',
  proprietarios: 'Proprietários'
};

const categoryColors: Record<FlowTemplate['category'], string> = {
  confirmacao: 'bg-green-500',
  qualificacao: 'bg-blue-500',
  atendimento: 'bg-purple-500',
  vendas: 'bg-orange-500',
  proprietarios: 'bg-amber-600'
};

export function TemplatePickerModal({ open, onOpenChange, onSelect }: TemplatePickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Escolher Template</DialogTitle>
          <DialogDescription>
            Selecione um template pré-definido para começar rapidamente
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid gap-4">
            {FLOW_TEMPLATES.map((template) => (
              <div
                key={template.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => {
                  onSelect(template);
                  onOpenChange(false);
                }}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${categoryColors[template.category]} text-white`}>
                    {categoryIcons[template.category]}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="secondary">
                        {categoryLabels[template.category]}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{template.nodes.length} nós</span>
                      <span>•</span>
                      <span>{template.edges.length} conexões</span>
                    </div>
                  </div>

                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
