import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { MessageCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';

function MessageNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as { text?: string; delay?: number };

  return (
    <BaseNode
      label={nodeData.label}
      icon={MessageCircle}
      color="#3b82f6"
      borderColor="#2563eb"
      selected={selected}
    >
      <div className="space-y-1">
        <p className="text-xs text-foreground line-clamp-2">
          {config.text || 'Clique para configurar a mensagem...'}
        </p>
        {config.delay && config.delay > 0 && (
          <p className="text-xs text-muted-foreground">
            ⏱️ Delay: {config.delay}s
          </p>
        )}
      </div>
    </BaseNode>
  );
}

export const MessageNode = memo(MessageNodeComponent);
