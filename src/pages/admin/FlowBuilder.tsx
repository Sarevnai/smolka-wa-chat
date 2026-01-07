import { useState, useCallback, useEffect, useRef } from 'react';
import { FlowToolbar } from '@/components/flow-builder/FlowToolbar';
import { NodePalette } from '@/components/flow-builder/NodePalette';
import { FlowBuilderCanvas, type FlowBuilderCanvasRef } from '@/components/flow-builder/FlowBuilderCanvas';
import { NodeConfigPanel } from '@/components/flow-builder/NodeConfigPanel';
import { FlowListModal } from '@/components/flow-builder/FlowListModal';
import { NewFlowModal } from '@/components/flow-builder/NewFlowModal';
import { FlowTestPanel } from '@/components/flow-builder/FlowTestPanel';
import { FlowNodeType, FlowNodeConfig, CustomFlowNode, CustomFlowEdge, FlowNodeData } from '@/types/flow';
import { toast } from 'sonner';
import { useFlowBuilder } from '@/hooks/useFlowBuilder';
import type { LayoutDirection } from '@/lib/flowLayout';
import type { Node } from '@xyflow/react';

interface SelectedNodeInfo {
  id: string;
  type: FlowNodeType;
  label: string;
  config: FlowNodeConfig;
}

export default function FlowBuilder() {
  const {
    currentFlow,
    flows,
    isLoadingFlows,
    hasUnsavedChanges,
    loadFlow,
    createFlow,
    saveFlow,
    publishFlow,
    deleteFlow,
    duplicateFlow,
    updateNodes,
    updateEdges,
    updateFlowName,
    setCurrentFlow,
    setHasUnsavedChanges,
    isCreating,
    isSaving,
    isPublishing,
  } = useFlowBuilder();

  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [showFlowList, setShowFlowList] = useState(false);
  const [showNewFlow, setShowNewFlow] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [nodes, setNodes] = useState<Node<FlowNodeData>[]>([]);
  const [edges, setEdges] = useState<CustomFlowEdge[]>([]);
  const [testCurrentNodeId, setTestCurrentNodeId] = useState<string | null>(null);
  const [testVisitedNodes, setTestVisitedNodes] = useState<string[]>([]);
  const canvasRef = useRef<FlowBuilderCanvasRef>(null);

  // Sync local state with current flow
  useEffect(() => {
    if (currentFlow) {
      setNodes(currentFlow.nodes);
      setEdges(currentFlow.edges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [currentFlow?.id]);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: FlowNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSave = useCallback(async () => {
    if (!currentFlow) return;
    
    setCurrentFlow({
      ...currentFlow,
      nodes: nodes as CustomFlowNode[],
      edges,
    });
    
    await saveFlow();
  }, [currentFlow, nodes, edges, saveFlow, setCurrentFlow]);

  const handleTest = useCallback(() => {
    if (!currentFlow) {
      toast.error('Selecione um fluxo primeiro');
      return;
    }
    setTestCurrentNodeId(null);
    setTestVisitedNodes([]);
    setShowTestPanel(true);
  }, [currentFlow]);

  const handleUndo = useCallback(() => {}, []);
  const handleRedo = useCallback(() => {}, []);
  const handleZoomIn = useCallback(() => {}, []);
  const handleZoomOut = useCallback(() => {}, []);
  const handleFitView = useCallback(() => {}, []);

  const handleAutoLayout = useCallback((direction: LayoutDirection) => {
    canvasRef.current?.autoLayout(direction);
    setHasUnsavedChanges(true);
    toast.success(`Layout ${direction === 'TB' ? 'vertical' : 'horizontal'} aplicado`);
  }, [setHasUnsavedChanges]);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    if (!nodeId) {
      setSelectedNode(null);
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (node && node.data) {
      setSelectedNode({
        id: node.id,
        type: node.type as FlowNodeType,
        label: (node.data as { label?: string }).label || node.type || '',
        config: (node.data as { config?: FlowNodeConfig }).config || {},
      });
    }
  }, [nodes]);

  const handleNodeLabelChange = useCallback((label: string) => {
    if (!selectedNode) return;

    const updatedNodes = nodes.map(n => 
      n.id === selectedNode.id 
        ? { ...n, data: { ...n.data, label } }
        : n
    );
    
    setNodes(updatedNodes);
    setSelectedNode({ ...selectedNode, label });
    setHasUnsavedChanges(true);
  }, [selectedNode, nodes, setHasUnsavedChanges]);

  const handleNodeConfigChange = useCallback((config: FlowNodeConfig) => {
    if (!selectedNode) return;

    const updatedNodes = nodes.map(n => 
      n.id === selectedNode.id 
        ? { ...n, data: { ...n.data, config } }
        : n
    );
    
    setNodes(updatedNodes);
    setSelectedNode({ ...selectedNode, config });
    setHasUnsavedChanges(true);
  }, [selectedNode, nodes, setHasUnsavedChanges]);

  const handleNodeDelete = useCallback(() => {
    if (!selectedNode) return;

    const updatedNodes = nodes.filter(n => n.id !== selectedNode.id);
    const updatedEdges = edges.filter(
      e => e.source !== selectedNode.id && e.target !== selectedNode.id
    );
    
    setNodes(updatedNodes);
    setEdges(updatedEdges);
    setSelectedNode(null);
    setHasUnsavedChanges(true);
  }, [selectedNode, nodes, edges, setHasUnsavedChanges]);

  const handleNodesChange = useCallback((newNodes: Node<FlowNodeData>[]) => {
    setNodes(newNodes);
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  const handleEdgesChange = useCallback((newEdges: CustomFlowEdge[]) => {
    setEdges(newEdges);
    setHasUnsavedChanges(true);
  }, [setHasUnsavedChanges]);

  const handleCreateFlow = useCallback(async (data: { name: string; description?: string; department: 'locacao' | 'vendas' | 'administrativo' | 'marketing' }) => {
    await createFlow(data);
    setShowNewFlow(false);
  }, [createFlow]);

  const handlePublish = useCallback(async () => {
    if (!currentFlow) return;
    await publishFlow({ id: currentFlow.id, isActive: !currentFlow.isActive });
  }, [currentFlow, publishFlow]);

  const handleOpenNew = useCallback(() => {
    setShowFlowList(false);
    setShowNewFlow(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <FlowToolbar
        flowName={currentFlow?.name || 'Selecione um fluxo'}
        onFlowNameChange={currentFlow ? updateFlowName : undefined}
        onSave={handleSave}
        onTest={handleTest}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onOpenFlowList={() => setShowFlowList(true)}
        onNewFlow={() => setShowNewFlow(true)}
        onPublish={handlePublish}
        onAutoLayout={handleAutoLayout}
        canUndo={false}
        canRedo={false}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        isActive={currentFlow?.isActive}
        isPublishing={isPublishing}
        hasFlow={!!currentFlow}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onDragStart={handleDragStart} />
        
        <FlowBuilderCanvas 
          ref={canvasRef}
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeSelect={handleNodeSelect}
          activeTestNodeId={testCurrentNodeId}
          visitedTestNodes={testVisitedNodes}
        />

        {selectedNode && (
          <NodeConfigPanel
            nodeId={selectedNode.id}
            nodeType={selectedNode.type}
            nodeLabel={selectedNode.label}
            config={selectedNode.config}
            onClose={() => setSelectedNode(null)}
            onLabelChange={handleNodeLabelChange}
            onConfigChange={handleNodeConfigChange}
            onDelete={handleNodeDelete}
          />
        )}
      </div>

      <FlowListModal
        open={showFlowList}
        onOpenChange={setShowFlowList}
        flows={flows}
        isLoading={isLoadingFlows}
        onSelect={loadFlow}
        onDelete={deleteFlow}
        onDuplicate={duplicateFlow}
        onNew={handleOpenNew}
      />

      <NewFlowModal
        open={showNewFlow}
        onOpenChange={setShowNewFlow}
        onConfirm={handleCreateFlow}
        isLoading={isCreating}
      />

      <FlowTestPanel
        open={showTestPanel}
        onOpenChange={setShowTestPanel}
        flow={currentFlow}
        currentNodeId={testCurrentNodeId}
        visitedNodes={testVisitedNodes}
        onCurrentNodeChange={setTestCurrentNodeId}
        onVisitedNodesChange={setTestVisitedNodes}
      />
    </div>
  );
}
