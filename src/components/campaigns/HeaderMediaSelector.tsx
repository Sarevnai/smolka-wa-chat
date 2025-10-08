import { useState } from "react";
import { Upload, X, Image, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMediaUpload } from "@/hooks/useMediaUpload";

interface HeaderMediaSelectorProps {
  mediaType: 'image' | 'video' | 'document';
  onMediaSelect: (media: {
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  } | null) => void;
  selectedMedia?: {
    id?: string;
    url?: string;
    type: 'image' | 'video' | 'document';
    mime?: string;
    filename?: string;
  } | null;
}

export function HeaderMediaSelector({ mediaType, onMediaSelect, selectedMedia }: HeaderMediaSelectorProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { uploadFile } = useMediaUpload();

  const getIcon = () => {
    switch (mediaType) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
    }
  };

  const getAcceptTypes = () => {
    switch (mediaType) {
      case 'image': return 'image/*';
      case 'video': return 'video/*';
      case 'document': return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadFile(file);
      if (result) {
        onMediaSelect({
          url: result.publicUrl,
          type: mediaType,
          mime: result.mimeType,
          filename: result.fileName,
        });
        toast({
          title: "Arquivo enviado",
          description: "Mídia carregada com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    onMediaSelect({
      url: urlInput.trim(),
      type: mediaType,
    });
    toast({
      title: "URL adicionada",
      description: "Link da mídia configurado.",
    });
  };

  const handleClear = () => {
    onMediaSelect(null);
    setUrlInput("");
  };

  return (
    <Card className="border-destructive/50">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <Label className="text-sm font-medium">
              Mídia do Cabeçalho ({mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : 'Documento'})
            </Label>
          </div>
          <span className="text-xs font-bold text-destructive uppercase">Obrigatório</span>
        </div>

        {selectedMedia ? (
          <div className="space-y-3">
            {/* Preview for images */}
            {selectedMedia.type === 'image' && selectedMedia.url && (
              <div className="relative w-full h-40 rounded-md overflow-hidden bg-muted">
                <img 
                  src={selectedMedia.url} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* File info */}
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <div className="flex-1 text-sm truncate">
                {selectedMedia.filename || selectedMedia.url || 'Mídia selecionada'}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="media-upload" className="text-sm text-muted-foreground mb-2 block">
                Upload de Arquivo
              </Label>
              <Input
                id="media-upload"
                type="file"
                accept={getAcceptTypes()}
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Ou</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Cole a URL pública da mídia"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
