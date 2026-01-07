import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Zap, Home, Tag, User } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData & { isTestActive?: boolean; wasTestVisited?: boolean };
  const config = nodeData.config as { actionType?: string; vistaFields?: Record<string, string> };

  const getActionInfo = (type?: string): { label: string; icon: LucideIcon } => {
    switch (type) {
      case 'update_vista':
        return { label: 'Atualizar Vista', icon: Home };
      case 'add_tag':
        return { label: 'Adicionar Tag', icon: Tag };
      case 'remove_tag':
        return { label: 'Remover Tag', icon: Tag };
      case 'update_contact':
        return { label: 'Atualizar Contato', icon: User };
      default:
        return { label: 'Ação', icon: Zap };
    }
  };

  const actionInfo = getActionInfo(config.actionType);
  const ActionIcon = actionInfo.icon;

  return (
    <BaseNode
      label={nodeData.label}
      icon={Zap}
      color="#a855f7"
      borderColor="#9333ea"
      selected={selected}
      isTestActive={nodeData.isTestActive}
      wasTestVisited={nodeData.wasTestVisited}
    >
      <div className="flex items-center gap-2">
        <ActionIcon className="h-4 w-4 text-purple-500" />
        <Badge variant="outline" className="text-xs">
          {actionInfo.label}
        </Badge>
      </div>
      {config.actionType === 'update_vista' && config.vistaFields && (
        <div className="mt-2 text-xs text-muted-foreground">
          {Object.keys(config.vistaFields).length} campo(s) configurado(s)
        </div>
      )}
    </BaseNode>
  );
}

export const ActionNode = memo(ActionNodeComponent);
