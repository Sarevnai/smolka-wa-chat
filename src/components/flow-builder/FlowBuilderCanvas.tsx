import { useCallback, useImperativeHandle, forwardRef, useMemo, DragEvent } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FlowNodeType, FlowNodeData, CustomFlowEdge, NODE_PALETTE_ITEMS } from '@/types/flow';
import { nodeTypes } from './nodes';
import { getLayoutedElements, type LayoutDirection } from '@/lib/flowLayout';
import type { Node, Edge } from '@xyflow/react';

export interface FlowBuilderCanvasRef {
  autoLayout: (direction?: LayoutDirection) => void;
}

interface FlowBuilderCanvasProps {
  nodes: Node<FlowNodeData>[];
  edges: CustomFlowEdge[];
  onNodesChange: (nodes: Node<FlowNodeData>[]) => void;
  onEdgesChange: (edges: CustomFlowEdge[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  activeTestNodeId?: string | null;
  visitedTestNodes?: string[];
}

const FlowCanvas = forwardRef<FlowBuilderCanvasRef, FlowBuilderCanvasProps>(({ 
  nodes,
  edges,
  onNodesChange, 
  onEdgesChange, 
  onNodeSelect,
  activeTestNodeId = null,
  visitedTestNodes = [],
}, ref) => {
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Inject test state into nodes - memoized to prevent re-initialization issues
  const nodesWithTestState = useMemo(() => 
    nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isTestActive: activeTestNodeId === node.id,
        wasTestVisited: visitedTestNodes.includes(node.id) && activeTestNodeId !== node.id,
      }
    })),
    [nodes, activeTestNodeId, visitedTestNodes]
  );

  // Auto-layout function
  const handleAutoLayout = useCallback((direction: LayoutDirection = 'TB') => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      direction
    );
    onNodesChange([...layoutedNodes] as Node<FlowNodeData>[]);
    onEdgesChange([...layoutedEdges] as CustomFlowEdge[]);
    
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, edges, onNodesChange, onEdgesChange, fitView]);

  // Expose function via ref
  useImperativeHandle(ref, () => ({
    autoLayout: handleAutoLayout
  }), [handleAutoLayout]);

  // Handle node changes from ReactFlow (drag, select, etc.)
  const handleNodesChangeInternal = useCallback((changes: NodeChange[]) => {
    const nextNodes = applyNodeChanges(changes, nodes);
    onNodesChange(nextNodes as Node<FlowNodeData>[]);
  }, [nodes, onNodesChange]);

  // Handle edge changes from ReactFlow
  const handleEdgesChangeInternal = useCallback((changes: EdgeChange[]) => {
    const nextEdges = applyEdgeChanges(changes, edges);
    onEdgesChange(nextEdges as CustomFlowEdge[]);
  }, [edges, onEdgesChange]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge({ ...params, animated: true }, edges);
      onEdgesChange(newEdges as CustomFlowEdge[]);
    },
    [edges, onEdgesChange]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
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
        type,
        position,
        data: { 
          label: paletteItem?.label || type,
          config: getDefaultConfig(type)
        },
      };

      onNodesChange([...nodes, newNode]);
    },
    [screenToFlowPosition, nodes, onNodesChange]
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
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodesWithTestState}
        edges={edges}
        onNodesChange={handleNodesChangeInternal}
        onEdgesChange={handleEdgesChangeInternal}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        className="bg-muted/30"
        defaultEdgeOptions={{
          animated: true,
          style: { strokeWidth: 2 }
        }}
      >
        <Controls className="bg-card border rounded-lg" />
        <MiniMap 
          className="bg-card border rounded-lg" 
          nodeColor={(node) => {
            if (activeTestNodeId === node.id) return '#22c55e';
            if (visitedTestNodes.includes(node.id)) return '#86efac';
            return getNodeBackground(node.type as FlowNodeType);
          }}
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
});

FlowCanvas.displayName = 'FlowCanvas';

// Wrapper with Provider and forwardRef
export const FlowBuilderCanvas = forwardRef<FlowBuilderCanvasRef, FlowBuilderCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <FlowCanvas ref={ref} {...props} />
    </ReactFlowProvider>
  );
});

FlowBuilderCanvas.displayName = 'FlowBuilderCanvas';

// Helper functions
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
