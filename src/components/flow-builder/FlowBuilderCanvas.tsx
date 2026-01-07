import { useCallback, useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
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
import { getLayoutedElements, type LayoutDirection } from '@/lib/flowLayout';
import type { Node } from '@xyflow/react';

export interface FlowBuilderCanvasRef {
  autoLayout: (direction?: LayoutDirection) => void;
}

interface FlowBuilderCanvasProps {
  onNodesChange?: (nodes: Node<FlowNodeData>[]) => void;
  onEdgesChange?: (edges: CustomFlowEdge[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  initialNodes?: Node<FlowNodeData>[];
  initialEdges?: CustomFlowEdge[];
  activeTestNodeId?: string | null;
  visitedTestNodes?: string[];
}

const FlowCanvas = forwardRef<FlowBuilderCanvasRef, FlowBuilderCanvasProps>(({ 
  onNodesChange, 
  onEdgesChange, 
  onNodeSelect,
  initialNodes = [],
  initialEdges = [],
  activeTestNodeId = null,
  visitedTestNodes = [],
}, ref) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState<Node<FlowNodeData>>(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const isInitialized = useRef(false);

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
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges] as CustomFlowEdge[]);
    
    // Ajustar visualização após um pequeno delay para garantir que o layout foi aplicado
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [nodes, edges, setNodes, setEdges, fitView]);

  // Expor função via ref
  useImperativeHandle(ref, () => ({
    autoLayout: handleAutoLayout
  }), [handleAutoLayout]);

  // Sync with external state when initialNodes/initialEdges change
  useEffect(() => {
    if (initialNodes.length > 0 || initialEdges.length > 0 || !isInitialized.current) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      isInitialized.current = true;
    }
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Notify parent of changes
  useEffect(() => {
    onNodesChange?.(nodes);
  }, [nodes, onNodesChange]);

  useEffect(() => {
    onEdgesChange?.(edges);
  }, [edges, onEdgesChange]);

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
        type,
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
        nodes={nodesWithTestState}
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

// Wrapper com Provider e forwardRef
export const FlowBuilderCanvas = forwardRef<FlowBuilderCanvasRef, FlowBuilderCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <FlowCanvas ref={ref} {...props} />
    </ReactFlowProvider>
  );
});

FlowBuilderCanvas.displayName = 'FlowBuilderCanvas';

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
