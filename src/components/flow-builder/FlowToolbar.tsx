import { Button } from '@/components/ui/button';
import { 
  Save, 
  Play, 
  Undo2, 
  Redo2, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  ArrowLeft,
  FolderOpen,
  Plus,
  Rocket,
  RocketIcon,
  Loader2,
  LayoutGrid,
  ArrowDown,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { LayoutDirection } from '@/lib/flowLayout';

interface FlowToolbarProps {
  flowName: string;
  onFlowNameChange?: (name: string) => void;
  onSave: () => void;
  onTest: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onOpenFlowList?: () => void;
  onNewFlow?: () => void;
  onPublish?: () => void;
  onAutoLayout?: (direction: LayoutDirection) => void;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  hasUnsavedChanges?: boolean;
  isActive?: boolean;
  isPublishing?: boolean;
  hasFlow?: boolean;
}

export function FlowToolbar({
  flowName,
  onFlowNameChange,
  onSave,
  onTest,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onOpenFlowList,
  onNewFlow,
  onPublish,
  onAutoLayout,
  canUndo,
  canRedo,
  isSaving,
  hasUnsavedChanges,
  isActive,
  isPublishing,
  hasFlow
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
        
        <div className="flex items-center gap-2">
          {onFlowNameChange ? (
            <Input
              value={flowName}
              onChange={(e) => onFlowNameChange(e.target.value)}
              className="h-8 w-48 font-semibold"
              placeholder="Nome do fluxo"
            />
          ) : (
            <h1 className="font-semibold text-lg">{flowName || 'Novo Fluxo'}</h1>
          )}
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs">Não salvo</Badge>
          )}
          {isActive && (
            <Badge variant="default" className="text-xs gap-1">
              <RocketIcon className="h-3 w-3" />
              Ativo
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Flow management */}
        {onOpenFlowList && (
          <Button variant="ghost" size="sm" onClick={onOpenFlowList} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Abrir
          </Button>
        )}
        {onNewFlow && (
          <Button variant="ghost" size="sm" onClick={onNewFlow} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo
          </Button>
        )}

        <Separator orientation="vertical" className="h-6" />

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

        {/* Auto Layout */}
        {onAutoLayout && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2" disabled={!hasFlow}>
                  <LayoutGrid className="h-4 w-4" />
                  Organizar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAutoLayout('TB')}>
                  <ArrowDown className="h-4 w-4 mr-2" />
                  Layout Vertical
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAutoLayout('LR')}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Layout Horizontal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

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
        <Button variant="outline" size="sm" onClick={onTest} className="gap-2" disabled={!hasFlow}>
          <Play className="h-4 w-4" />
          Testar
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onSave} 
          disabled={isSaving || !hasFlow} 
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>

        {onPublish && hasFlow && (
          <Button 
            size="sm" 
            onClick={onPublish} 
            disabled={isPublishing}
            className="gap-2"
            variant={isActive ? 'secondary' : 'default'}
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Rocket className="h-4 w-4" />
            )}
            {isActive ? 'Despublicar' : 'Publicar'}
          </Button>
        )}
      </div>
    </div>
  );
}
