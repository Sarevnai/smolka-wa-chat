import { StartNode } from './StartNode';
import { MessageNode } from './MessageNode';
import { ConditionNode } from './ConditionNode';
import { ActionNode } from './ActionNode';
import { EscalationNode } from './EscalationNode';
import { IntegrationNode } from './IntegrationNode';
import { DelayNode } from './DelayNode';
import { EndNode } from './EndNode';

export const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  condition: ConditionNode,
  action: ActionNode,
  escalation: EscalationNode,
  integration: IntegrationNode,
  delay: DelayNode,
  end: EndNode,
};

export {
  StartNode,
  MessageNode,
  ConditionNode,
  ActionNode,
  EscalationNode,
  IntegrationNode,
  DelayNode,
  EndNode,
};
