import { X, Play, MessageCircle, GitBranch, Zap, UserPlus, Webhook, Clock, Square, TextCursorInput, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FlowNodeType, 
  FlowNodeConfig,
  StartNodeConfig,
  MessageNodeConfig,
  ConditionNodeConfig,
  ActionNodeConfig,
  EscalationNodeConfig,
  IntegrationNodeConfig,
  DelayNodeConfig,
  EndNodeConfig,
  InputNodeConfig
} from '@/types/flow';
import {
  StartConfig,
  MessageConfig,
  ConditionConfig,
  ActionConfig,
  EscalationConfig,
  IntegrationConfig,
  DelayConfig,
  EndConfig,
  InputConfig
} from './config';
import { NODE_PALETTE_ITEMS } from '@/types/flow';

const iconMap: Record<string, LucideIcon> = {
  Play,
  MessageCircle,
  GitBranch,
  Zap,
  UserPlus,
  Webhook,
  Clock,
  Square,
  TextCursor: TextCursorInput
};

interface NodeConfigPanelProps {
  nodeId: string;
  nodeType: FlowNodeType;
  nodeLabel: string;
  config: FlowNodeConfig;
  onClose: () => void;
  onLabelChange: (label: string) => void;
  onConfigChange: (config: FlowNodeConfig) => void;
  onDelete: () => void;
}

export function NodeConfigPanel({
  nodeId,
  nodeType,
  nodeLabel,
  config,
  onClose,
  onLabelChange,
  onConfigChange,
  onDelete
}: NodeConfigPanelProps) {
  const paletteItem = NODE_PALETTE_ITEMS.find(item => item.type === nodeType);
  const IconComponent = paletteItem?.icon ? iconMap[paletteItem.icon] : null;

  const renderConfigForm = () => {
    switch (nodeType) {
      case 'start':
        return (
          <StartConfig 
            config={config as StartNodeConfig} 
            onChange={onConfigChange as (config: StartNodeConfig) => void} 
          />
        );
      case 'message':
        return (
          <MessageConfig 
            config={config as MessageNodeConfig} 
            onChange={onConfigChange as (config: MessageNodeConfig) => void} 
          />
        );
      case 'condition':
        return (
          <ConditionConfig 
            config={config as ConditionNodeConfig} 
            onChange={onConfigChange as (config: ConditionNodeConfig) => void} 
          />
        );
      case 'action':
        return (
          <ActionConfig 
            config={config as ActionNodeConfig} 
            onChange={onConfigChange as (config: ActionNodeConfig) => void} 
          />
        );
      case 'escalation':
        return (
          <EscalationConfig 
            config={config as EscalationNodeConfig} 
            onChange={onConfigChange as (config: EscalationNodeConfig) => void} 
          />
        );
      case 'integration':
        return (
          <IntegrationConfig 
            config={config as IntegrationNodeConfig} 
            onChange={onConfigChange as (config: IntegrationNodeConfig) => void} 
          />
        );
      case 'delay':
        return (
          <DelayConfig 
            config={config as DelayNodeConfig} 
            onChange={onConfigChange as (config: DelayNodeConfig) => void} 
          />
        );
      case 'end':
        return (
          <EndConfig 
            config={config as EndNodeConfig} 
            onChange={onConfigChange as (config: EndNodeConfig) => void} 
          />
        );
      case 'input':
        return (
          <InputConfig 
            config={config as InputNodeConfig} 
            onChange={onConfigChange as (config: InputNodeConfig) => void} 
          />
        );
      default:
        return <p className="text-muted-foreground">Configuração não disponível</p>;
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${paletteItem?.color || 'bg-gray-500'}`}>
            {IconComponent && <IconComponent className="h-4 w-4 text-white" />}
          </div>
          <div>
            <h3 className="font-semibold text-sm">{paletteItem?.label || nodeType}</h3>
            <p className="text-xs text-muted-foreground">{nodeId}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Nome do Nó</Label>
            <Input
              value={nodeLabel}
              onChange={(e) => onLabelChange(e.target.value)}
              placeholder="Nome personalizado"
            />
          </div>

          <Separator />

          {renderConfigForm()}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={onDelete}
        >
          Excluir Nó
        </Button>
      </div>
    </div>
  );
}
