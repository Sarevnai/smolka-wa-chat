import { useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MessageRow } from "@/lib/messages";

interface MediaGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  messages: MessageRow[];
  initialMediaIndex?: number;
}

interface MediaItem {
  id: number;
  url: string;
  type: string;
  caption?: string;
  timestamp: string;
  filename?: string;
}

export function MediaGallery({ isOpen, onClose, messages, initialMediaIndex = 0 }: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialMediaIndex);
  const [activeTab, setActiveTab] = useState("all");

  // Extract media items from messages
  const allMedia: MediaItem[] = messages
    .filter(msg => msg.media_url && msg.media_type)
    .map(msg => ({
      id: msg.id,
      url: msg.media_url!,
      type: msg.media_type!,
      caption: msg.media_caption || undefined,
      timestamp: msg.wa_timestamp || msg.created_at || '',
      filename: msg.media_filename || undefined
    }))
    .reverse(); // Most recent first

  const images = allMedia.filter(item => item.type?.startsWith('image/'));
  const videos = allMedia.filter(item => item.type?.startsWith('video/'));
  const documents = allMedia.filter(item => !item.type?.startsWith('image/') && !item.type?.startsWith('video/'));

  const getCurrentMedia = () => {
    switch (activeTab) {
      case 'images':
        return images;
      case 'videos':
        return videos;
      case 'documents':
        return documents;
      default:
        return allMedia;
    }
  };

  const currentMedia = getCurrentMedia();
  const currentItem = currentMedia[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : currentMedia.length - 1);
  };

  const goToNext = () => {
    setCurrentIndex(prev => prev < currentMedia.length - 1 ? prev + 1 : 0);
  };

  const handleDownload = () => {
    if (!currentItem) return;
    
    const link = document.createElement('a');
    link.href = currentItem.url;
    link.download = currentItem.filename || 'media';
    link.click();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Galeria de Mídia</span>
            </div>
            <div className="flex items-center gap-2">
              {currentItem && (
                <Button variant="ghost" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="m-4 mb-0">
              <TabsTrigger value="all">Todos ({allMedia.length})</TabsTrigger>
              <TabsTrigger value="images">Fotos ({images.length})</TabsTrigger>
              <TabsTrigger value="videos">Vídeos ({videos.length})</TabsTrigger>
              <TabsTrigger value="documents">Documentos ({documents.length})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 m-0">
              {currentMedia.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Nenhuma mídia encontrada nesta categoria
                </div>
              ) : (
                <div className="flex h-full">
                  {/* Main viewer */}
                  <div className="flex-1 flex items-center justify-center bg-black/5 relative">
                    {currentItem && (
                      <>
                        {currentItem.type?.startsWith('image/') && (
                          <img
                            src={currentItem.url}
                            alt="Media"
                            className="max-w-full max-h-full object-contain"
                          />
                        )}
                        {currentItem.type?.startsWith('video/') && (
                          <video
                            src={currentItem.url}
                            controls
                            className="max-w-full max-h-full object-contain"
                          />
                        )}
                        {!currentItem.type?.startsWith('image/') && !currentItem.type?.startsWith('video/') && (
                          <div className="flex flex-col items-center gap-4 p-8">
                            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                              <Calendar className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium">{currentItem.filename || 'Documento'}</p>
                              <p className="text-sm text-muted-foreground">{currentItem.type}</p>
                            </div>
                            <Button onClick={handleDownload}>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        )}

                        {/* Navigation arrows */}
                        {currentMedia.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80"
                              onClick={goToPrevious}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80"
                              onClick={goToNext}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </>
                        )}

                        {/* Media info */}
                        {currentItem.caption && (
                          <div className="absolute bottom-4 left-4 right-4 bg-background/80 backdrop-blur-sm rounded-lg p-3">
                            <p className="text-sm">{currentItem.caption}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDate(currentItem.timestamp)}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Thumbnail sidebar */}
                  <div className="w-64 border-l bg-muted/50 p-4 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {currentMedia.map((item, index) => (
                        <div
                          key={item.id}
                          className={cn(
                            "aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors",
                            index === currentIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/50"
                          )}
                          onClick={() => setCurrentIndex(index)}
                        >
                          {item.type?.startsWith('image/') ? (
                            <img
                              src={item.url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : item.type?.startsWith('video/') ? (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Calendar className="h-6 w-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <div className="text-xs font-medium text-center p-2">
                                {item.filename || 'Doc'}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}