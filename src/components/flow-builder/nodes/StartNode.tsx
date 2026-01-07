import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';
import { Badge } from '@/components/ui/badge';

function StartNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData & { isTestActive?: boolean; wasTestVisited?: boolean };
  const config = nodeData.config as { trigger?: string };

  const getTriggerLabel = (trigger?: string) => {
    switch (trigger) {
      case 'first_message':
        return 'Primeira mensagem';
      case 'keyword':
        return 'Palavra-chave';
      case 'template_response':
        return 'Resposta de template';
      default:
        return 'Qualquer mensagem';
    }
  };

  return (
    <BaseNode
      label={nodeData.label}
      icon={Play}
      color="#22c55e"
      borderColor="#16a34a"
      selected={selected}
      showTargetHandle={false}
      isTestActive={nodeData.isTestActive}
      wasTestVisited={nodeData.wasTestVisited}
    >
      <Badge variant="secondary" className="text-xs">
        {getTriggerLabel(config.trigger)}
      </Badge>
    </BaseNode>
  );
}

export const StartNode = memo(StartNodeComponent);
