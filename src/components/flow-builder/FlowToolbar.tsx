import { Button } from '@/components/ui/button';
import { 
  Save, 
  Play, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';

interface FlowToolbarProps {
  flowName: string;
  onSave: () => void;
  onTest: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
}

export function FlowToolbar({
  flowName,
  onSave,
  onTest,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  canUndo,
  canRedo,
  isSaving
}: FlowToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className="h-14 border-b bg-card px-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/marketing/ai-config')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <div>
          <h1 className="font-semibold text-lg">{flowName || 'Novo Fluxo'}</h1>
          <p className="text-xs text-muted-foreground">Flow Builder</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 mr-2">
          <Button variant="ghost" size="icon" onClick={onZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onFitView}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 mr-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onUndo}
            disabled={!canUndo}
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onRedo}
            disabled={!canRedo}
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Actions */}
        <Button variant="outline" size="sm" onClick={onTest} className="gap-2">
          <Play className="h-4 w-4" />
          Testar
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving} className="gap-2">
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}
