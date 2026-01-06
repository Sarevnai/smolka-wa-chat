import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FlowNodeType, FlowNodeData, CustomFlowEdge, NODE_PALETTE_ITEMS } from '@/types/flow';
import { nodeTypes } from './nodes';
import type { Node } from '@xyflow/react';

// Nó inicial padrão
const initialNodes: Node<FlowNodeData>[] = [];
const initialEdges: CustomFlowEdge[] = [];

interface FlowBuilderCanvasProps {
  onNodesChange?: (nodes: Node<FlowNodeData>[]) => void;
  onEdgesChange?: (edges: CustomFlowEdge[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
}

function FlowCanvas({ onNodesChange, onEdgesChange, onNodeSelect }: FlowBuilderCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node<FlowNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const { screenToFlowPosition } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow') as FlowNodeType;
      
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const paletteItem = NODE_PALETTE_ITEMS.find(item => item.type === type);
      
      const newNode: Node<FlowNodeData> = {
        id: `${type}-${Date.now()}`,
        type, // Usa o tipo customizado
        position,
        data: { 
          label: paletteItem?.label || type,
          config: getDefaultConfig(type)
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect?.(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-muted/30"
        defaultEdgeOptions={{
          animated: true,
          style: { strokeWidth: 2 }
        }}
      >
        <Controls className="bg-card border rounded-lg" />
        <MiniMap 
          className="bg-card border rounded-lg" 
          nodeColor={(node) => getNodeBackground(node.type as FlowNodeType)}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}

// Wrapper com Provider
export function FlowBuilderCanvas(props: FlowBuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}

// Funções auxiliares
function getDefaultConfig(type: FlowNodeType): Record<string, unknown> {
  switch (type) {
    case 'start':
      return { trigger: 'first_message' };
    case 'message':
      return { text: '', delay: 0 };
    case 'condition':
      return { conditionType: 'keyword', branches: [
        { id: '1', label: 'Sim', value: 'yes' },
        { id: '2', label: 'Não', value: 'no' },
      ]};
    case 'action':
      return { actionType: 'update_vista' };
    case 'escalation':
      return { department: 'locacao', priority: 'medium' };
    case 'integration':
      return { integrationType: 'webhook', method: 'POST' };
    case 'delay':
      return { duration: 5, unit: 'seconds' };
    case 'end':
      return { closeConversation: true };
    default:
      return {};
  }
}

function getNodeBackground(type: FlowNodeType | string): string {
  const colors: Record<string, string> = {
    start: '#22c55e',
    message: '#3b82f6',
    condition: '#eab308',
    action: '#a855f7',
    escalation: '#f97316',
    integration: '#6366f1',
    delay: '#64748b',
    end: '#ef4444',
    default: '#6b7280'
  };
  return colors[type] || colors.default;
}
