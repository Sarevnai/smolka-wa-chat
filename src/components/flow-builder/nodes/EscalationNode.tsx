import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { UserPlus } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';
import { Badge } from '@/components/ui/badge';

function EscalationNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as { 
    department?: string; 
    priority?: string;
    reason?: string;
  };

  const getDepartmentLabel = (dept?: string) => {
    switch (dept) {
      case 'locacao':
        return 'Locação';
      case 'vendas':
        return 'Vendas';
      case 'administrativo':
        return 'Administrativo';
      case 'marketing':
        return 'Marketing';
      default:
        return 'Não definido';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <BaseNode
      label={nodeData.label}
      icon={UserPlus}
      color="#f97316"
      borderColor="#ea580c"
      selected={selected}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Departamento:</span>
          <Badge variant="outline" className="text-xs">
            {getDepartmentLabel(config.department)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Prioridade:</span>
          <Badge variant={getPriorityColor(config.priority) as any} className="text-xs">
            {config.priority || 'Média'}
          </Badge>
        </div>
      </div>
    </BaseNode>
  );
}

export const EscalationNode = memo(EscalationNodeComponent);
