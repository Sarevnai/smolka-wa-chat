import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Clock } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';

function DelayNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as { 
    duration?: number;
    unit?: string;
  };

  const getUnitLabel = (unit?: string) => {
    switch (unit) {
      case 'seconds':
        return 'segundo(s)';
      case 'minutes':
        return 'minuto(s)';
      case 'hours':
        return 'hora(s)';
      default:
        return 'segundo(s)';
    }
  };

  return (
    <BaseNode
      label={nodeData.label}
      icon={Clock}
      color="#64748b"
      borderColor="#475569"
      selected={selected}
    >
      <div className="flex items-center justify-center gap-1 py-1">
        <span className="text-2xl font-bold text-foreground">
          {config.duration || 5}
        </span>
        <span className="text-xs text-muted-foreground">
          {getUnitLabel(config.unit)}
        </span>
      </div>
    </BaseNode>
  );
}

export const DelayNode = memo(DelayNodeComponent);
