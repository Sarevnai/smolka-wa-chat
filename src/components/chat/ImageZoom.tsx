import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Maximize,
  Minimize
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageZoomProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  caption?: string;
  filename?: string;
  images?: Array<{ url: string; caption?: string; filename?: string }>;
  currentIndex?: number;
}

export function ImageZoom({ 
  isOpen, 
  onClose, 
  imageUrl, 
  caption, 
  filename,
  images = [],
  currentIndex = 0
}: ImageZoomProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(currentIndex);

  const currentImage = images.length > 0 ? images[activeIndex] : { url: imageUrl, caption, filename };
  const hasMultipleImages = images.length > 1;

  // Reset states when dialog opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setActiveIndex(currentIndex);
    }
  }, [isOpen, currentIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '=':
        case '+':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case 'r':
          e.preventDefault();
          rotate();
          break;
        case 'ArrowLeft':
          if (hasMultipleImages) {
            e.preventDefault();
            previousImage();
          }
          break;
        case 'ArrowRight':
          if (hasMultipleImages) {
            e.preventDefault();
            nextImage();
          }
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeydown);
      return () => document.removeEventListener('keydown', handleKeydown);
    }
  }, [isOpen, hasMultipleImages]);

  const zoomIn = () => setScale(prev => Math.min(prev * 1.25, 5));
  const zoomOut = () => setScale(prev => Math.max(prev * 0.8, 0.25));
  const rotate = () => setRotation(prev => (prev + 90) % 360);
  const resetZoom = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const previousImage = () => {
    if (hasMultipleImages) {
      setActiveIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
      resetZoom();
    }
  };

  const nextImage = () => {
    if (hasMultipleImages) {
      setActiveIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
      resetZoom();
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale === 1) return;
    
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
    e.preventDefault();
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || scale === 1) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart, scale]);

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentImage.filename || `image-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-none w-screen h-screen p-0 bg-background/95 backdrop-blur",
        isFullscreen && "border-0"
      )}>
        {/* Controls */}
        <div className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center">
          <div className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg p-2">
            <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.25}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-mono min-w-[3rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 5}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={rotate}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={resetZoom}>
              Resetar
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-background/80 backdrop-blur rounded-lg p-2">
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation for multiple images */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost" 
              size="sm"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur"
              onClick={previousImage}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <Button
              variant="ghost" 
              size="sm"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-background/80 backdrop-blur"
              onClick={nextImage}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>

            {/* Image counter */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-background/80 backdrop-blur rounded-lg px-3 py-1">
              <span className="text-sm">
                {activeIndex + 1} de {images.length}
              </span>
            </div>
          </>
        )}

        {/* Image container */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <img
            src={currentImage.url}
            alt={currentImage.caption || 'Imagem'}
            className="max-w-none max-h-none select-none transition-transform duration-200"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
            }}
            draggable={false}
            onClick={() => scale === 1 && zoomIn()}
          />
        </div>

        {/* Caption */}
        {currentImage.caption && (
          <div className="absolute bottom-4 left-4 right-4 z-50 bg-background/80 backdrop-blur rounded-lg p-4">
            <p className="text-sm text-foreground">{currentImage.caption}</p>
          </div>
        )}

        {/* Keyboard shortcuts hint */}
        <div className="absolute bottom-4 right-4 z-50 bg-background/80 backdrop-blur rounded-lg p-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-1">
            <span>ESC: Fechar</span>
            <span>+/-: Zoom</span>
            <span>R: Girar</span>
            <span>0: Resetar</span>
            {hasMultipleImages && (
              <>
                <span>←→: Navegar</span>
                <span>F: Tela cheia</span>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}