import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import { FlowNodeData } from '@/types/flow';
import { cn } from '@/lib/utils';

interface Branch {
  id: string;
  label: string;
  value: string;
}

function ConditionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as { 
    conditionType?: string; 
    branches?: Branch[];
  };

  const branches = config.branches || [
    { id: '1', label: 'Sim', value: 'yes' },
    { id: '2', label: 'Não', value: 'no' },
  ];

  const getConditionLabel = (type?: string) => {
    switch (type) {
      case 'keyword':
        return 'Por palavra-chave';
      case 'intent':
        return 'Por intenção';
      case 'time':
        return 'Por horário';
      case 'tag':
        return 'Por tag';
      default:
        return 'Condição';
    }
  };

  return (
    <div
      className={cn(
        "min-w-[200px] rounded-xl shadow-lg transition-all duration-200",
        "bg-card border-2 border-yellow-500",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
    >
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
      />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-yellow-500">
        <GitBranch className="h-4 w-4 text-white" />
        <span className="font-medium text-white text-sm">{nodeData.label}</span>
      </div>

      {/* Content */}
      <div className="p-3">
        <p className="text-xs text-muted-foreground mb-3">
          {getConditionLabel(config.conditionType)}
        </p>

        {/* Branches */}
        <div className="flex justify-around gap-2">
          {branches.map((branch, index) => (
            <div 
              key={branch.id} 
              className="flex flex-col items-center"
            >
              <span className="text-xs font-medium text-foreground mb-1">
                {branch.label}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={`branch-${branch.id}`}
                className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-background !relative !transform-none !left-auto !top-auto"
                style={{ position: 'relative' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
