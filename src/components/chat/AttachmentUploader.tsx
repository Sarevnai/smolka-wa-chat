import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { Paperclip, Image, FileText, Camera, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttachmentUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  preview?: string;
}

export function AttachmentUploader({ onFileSelect, disabled }: AttachmentUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Validate file size (20MB max)
      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 20MB`,
          variant: "destructive",
        });
        return;
      }

      // Create preview for images
      const uploadingFile: UploadingFile = {
        file,
        progress: 0,
      };

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadingFile.preview = e.target?.result as string;
          setUploadingFiles(prev => 
            prev.map(f => f.file === file ? { ...f, preview: uploadingFile.preview } : f)
          );
        };
        reader.readAsDataURL(file);
      }

      setUploadingFiles(prev => [...prev, uploadingFile]);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadingFiles(prev => 
          prev.map(f => {
            if (f.file === file) {
              const newProgress = Math.min(f.progress + Math.random() * 30, 100);
              if (newProgress >= 100) {
                clearInterval(interval);
                onFileSelect(file);
                // Remove from uploading after a delay
                setTimeout(() => {
                  setUploadingFiles(p => p.filter(uf => uf.file !== file));
                }, 1000);
              }
              return { ...f, progress: newProgress };
            }
            return f;
          })
        );
      }, 200);
    });
  }, [onFileSelect]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removeUploadingFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(f => f.file !== file));
  };

  const attachmentOptions = [
    {
      icon: Image,
      label: "Foto ou Vídeo",
      accept: "image/*,video/*",
      onClick: () => imageInputRef.current?.click(),
    },
    {
      icon: Camera,
      label: "Câmera",
      accept: "image/*",
      onClick: () => {
        // For camera access, we'd need to implement a camera component
        toast({
          title: "Em breve",
          description: "Acesso à câmera será implementado em breve",
        });
      },
    },
    {
      icon: FileText,
      label: "Documento",
      accept: ".pdf,.doc,.docx,.txt,.rtf",
      onClick: () => fileInputRef.current?.click(),
    },
  ];

  return (
    <div 
      className="relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="fixed inset-0 bg-primary/20 border-2 border-dashed border-primary z-50 flex items-center justify-center">
          <div className="bg-background p-6 rounded-lg shadow-lg">
            <p className="text-lg font-medium">Solte os arquivos aqui</p>
          </div>
        </div>
      )}

      {/* Uploading files preview */}
      {uploadingFiles.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={index}
              className="bg-background border rounded-lg p-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                {uploadingFile.preview ? (
                  <img
                    src={uploadingFile.preview}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(uploadingFile.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <Progress value={uploadingFile.progress} className="h-1 mt-1" />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => removeUploadingFile(uploadingFile.file)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0 hover:bg-muted rounded-full"
            disabled={disabled}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start" side="top">
          <div className="space-y-1">
            {attachmentOptions.map((option, index) => (
              <Button
                key={index}
                variant="ghost"
                className="w-full justify-start h-9 px-3"
                onClick={option.onClick}
                disabled={disabled}
              >
                <option.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                <span className="text-sm">{option.label}</span>
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.rtf"
        onChange={(e) => handleFileSelect(e.target.files)}
        multiple
      />
      <input
        ref={imageInputRef}
        type="file"
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => handleFileSelect(e.target.files)}
        multiple
      />
    </div>
  );
}