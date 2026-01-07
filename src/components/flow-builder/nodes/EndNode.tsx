import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Square, CheckCircle, XCircle } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';
import { Badge } from '@/components/ui/badge';

function EndNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData & { isTestActive?: boolean; wasTestVisited?: boolean };
  const config = nodeData.config as { 
    message?: string;
    closeConversation?: boolean;
  };

  return (
    <BaseNode
      label={nodeData.label}
      icon={Square}
      color="#ef4444"
      borderColor="#dc2626"
      selected={selected}
      showSourceHandle={false}
      isTestActive={nodeData.isTestActive}
      wasTestVisited={nodeData.wasTestVisited}
    >
      <div className="space-y-2">
        {config.message && (
          <p className="text-xs text-foreground line-clamp-2">
            "{config.message}"
          </p>
        )}
        <div className="flex items-center gap-2">
          {config.closeConversation ? (
            <>
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">Encerra conversa</span>
            </>
          ) : (
            <>
              <XCircle className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Mantém aberta</span>
            </>
          )}
        </div>
      </div>
    </BaseNode>
  );
}

export const EndNode = memo(EndNodeComponent);
