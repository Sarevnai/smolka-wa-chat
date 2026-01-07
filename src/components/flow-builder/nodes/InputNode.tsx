import { memo } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { TextCursorInput } from 'lucide-react';
import { FlowNodeData, InputNodeConfig } from '@/types/flow';
import { cn } from '@/lib/utils';

function InputNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as InputNodeConfig;

  const getTypeLabel = (type?: string) => {
    switch (type) {
      case 'text':
        return 'Texto livre';
      case 'number':
        return 'Número';
      case 'currency':
        return 'Valor (R$)';
      case 'yes_no':
        return 'Sim/Não';
      case 'email':
        return 'E-mail';
      case 'phone':
        return 'Telefone';
      default:
        return 'Texto';
    }
  };

  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl shadow-lg transition-all duration-200",
        "bg-card border-2 border-cyan-500",
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
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg bg-cyan-500">
        <TextCursorInput className="h-4 w-4 text-white" />
        <span className="font-medium text-white text-sm">{nodeData.label}</span>
      </div>

      {/* Content */}
      <div className="p-3 text-sm">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Variável: <span className="font-mono text-foreground">{config.variableName || 'resposta'}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Tipo: <span className="text-foreground">{getTypeLabel(config.expectedType)}</span>
          </p>
          {config.timeout && (
            <p className="text-xs text-muted-foreground">
              Timeout: <span className="text-foreground">{config.timeout}s</span>
            </p>
          )}
        </div>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
      />
    </div>
  );
}

export const InputNode = memo(InputNodeComponent);
