import { useState } from "react";
import { Download, FileText, MapPin, Volume2, Image, Video, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaMessageProps {
  mediaType: string;
  mediaUrl?: string | null;
  caption?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  isOutbound: boolean;
}

export function MediaMessage({ 
  mediaType, 
  mediaUrl, 
  caption, 
  filename, 
  mimeType,
  isOutbound 
}: MediaMessageProps) {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const handleDownload = async () => {
    if (!mediaUrl) return;
    
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `media.${mimeType?.split('/')[1] || 'file'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const renderMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return (
          <div className="relative group cursor-pointer" onClick={() => setShowImageDialog(true)}>
            <img 
              src={mediaUrl || ''} 
              alt={caption || 'Imagem'} 
              className="rounded-lg max-w-full h-auto max-h-64 object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-image.png';
                e.currentTarget.alt = 'Imagem não disponível';
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
              <Image className="h-8 w-8 text-white opacity-0 group-hover:opacity-70 transition-opacity" />
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            <video 
              src={mediaUrl || ''} 
              className="rounded-lg max-w-full h-auto max-h-64"
              controls
              preload="metadata"
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
            >
              Seu navegador não suporta vídeos.
            </video>
            {caption && (
              <p className="text-sm mt-2 opacity-80">{caption}</p>
            )}
          </div>
        );

      case 'audio':
      case 'voice':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Volume2 className="h-5 w-5 opacity-70" />
            <div className="flex-1">
              <audio 
                src={mediaUrl || ''} 
                controls 
                className="w-full"
                onPlay={() => setAudioPlaying(true)}
                onPause={() => setAudioPlaying(false)}
              />
            </div>
          </div>
        );

      case 'sticker':
        return (
          <div className="relative">
            <img 
              src={mediaUrl || ''} 
              alt="Figurinha" 
              className="rounded-lg max-w-32 h-auto object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-sticker.png';
                e.currentTarget.alt = 'Figurinha não disponível';
              }}
            />
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg max-w-xs">
            <FileText className="h-8 w-8 opacity-70 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {filename || 'Documento'}
              </p>
              <p className="text-xs opacity-70">
                {mimeType || 'Arquivo'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDownload}
              className="flex-shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );

      case 'location':
        return (
          <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg max-w-xs">
            <MapPin className="h-5 w-5 opacity-70 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">📍 Localização</p>
              {caption && (
                <p className="text-xs opacity-80 mt-1 whitespace-pre-line">{caption}</p>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
            <FileText className="h-5 w-5 opacity-70" />
            <span className="text-sm">Tipo de mídia não suportado: {mediaType}</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {renderMediaContent()}
      
      {/* Caption for images (shown below the image) */}
      {mediaType === 'image' && caption && (
        <p className="text-sm opacity-80">{caption}</p>
      )}

      {/* Image preview dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-4xl w-full p-0">
          <img 
            src={mediaUrl || ''} 
            alt={caption || 'Imagem'} 
            className="w-full h-auto max-h-[90vh] object-contain"
          />
          {caption && (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">{caption}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}