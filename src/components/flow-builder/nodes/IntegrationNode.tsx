import { memo } from 'react';
import { NodeProps } from '@xyflow/react';
import { Webhook, Globe, Workflow } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { FlowNodeData } from '@/types/flow';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';

function IntegrationNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as FlowNodeData;
  const config = nodeData.config as { 
    integrationType?: string;
    url?: string;
    method?: string;
  };

  const getIntegrationInfo = (type?: string): { label: string; icon: LucideIcon } => {
    switch (type) {
      case 'webhook':
        return { label: 'Webhook', icon: Webhook };
      case 'n8n':
        return { label: 'N8N', icon: Workflow };
      case 'api':
        return { label: 'API Externa', icon: Globe };
      default:
        return { label: 'Integração', icon: Webhook };
    }
  };

  const info = getIntegrationInfo(config.integrationType);
  const IntegrationIcon = info.icon;

  return (
    <BaseNode
      label={nodeData.label}
      icon={Webhook}
      color="#6366f1"
      borderColor="#4f46e5"
      selected={selected}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <IntegrationIcon className="h-4 w-4 text-indigo-500" />
          <Badge variant="outline" className="text-xs">
            {info.label}
          </Badge>
        </div>
        {config.url && (
          <p className="text-xs text-muted-foreground truncate max-w-[150px]">
            {config.method || 'POST'}: {config.url}
          </p>
        )}
      </div>
    </BaseNode>
  );
}

export const IntegrationNode = memo(IntegrationNodeComponent);
