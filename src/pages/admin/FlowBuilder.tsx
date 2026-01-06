import { useState, useCallback } from 'react';
import { FlowToolbar } from '@/components/flow-builder/FlowToolbar';
import { NodePalette } from '@/components/flow-builder/NodePalette';
import { FlowBuilderCanvas } from '@/components/flow-builder/FlowBuilderCanvas';
import { FlowNodeType } from '@/types/flow';
import { toast } from 'sonner';

export default function FlowBuilder() {
  const [flowName] = useState('Fluxo de Atendimento');
  const [isSaving, setIsSaving] = useState(false);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: FlowNodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    // TODO: Implementar salvamento no Supabase
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Fluxo salvo com sucesso!');
    setIsSaving(false);
  }, []);

  const handleTest = useCallback(() => {
    toast.info('Modo de teste será implementado na próxima fase');
  }, []);

  const handleUndo = useCallback(() => {
    // TODO: Implementar undo
  }, []);

  const handleRedo = useCallback(() => {
    // TODO: Implementar redo
  }, []);

  const handleZoomIn = useCallback(() => {
    // Controlado pelo ReactFlow internamente
  }, []);

  const handleZoomOut = useCallback(() => {
    // Controlado pelo ReactFlow internamente
  }, []);

  const handleFitView = useCallback(() => {
    // Controlado pelo ReactFlow internamente
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background">
      <FlowToolbar
        flowName={flowName}
        onSave={handleSave}
        onTest={handleTest}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        canUndo={false}
        canRedo={false}
        isSaving={isSaving}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <NodePalette onDragStart={handleDragStart} />
        <FlowBuilderCanvas />
      </div>
    </div>
  );
}
