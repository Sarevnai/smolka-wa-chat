import { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WhatsAppProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onUploadComplete: () => void;
}

export function WhatsAppProfilePhotoUpload({ 
  currentPhotoUrl, 
  onUploadComplete 
}: WhatsAppProfilePhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPEG ou PNG.');
      return false;
    }
    
    // 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB.');
      return false;
    }
    
    return true;
  };

  const processFile = (file: File) => {
    if (!validateFile(file)) return;
    
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await fetch(
        'https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/upload-whatsapp-profile-photo',
        {
          method: 'POST',
          body: formData,
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao fazer upload');
      }
      
      toast.success('Foto de perfil atualizada com sucesso!');
      setPreview(null);
      setSelectedFile(null);
      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer upload da foto');
    } finally {
      setIsUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayImage = preview || currentPhotoUrl;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          "cursor-pointer"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        {displayImage ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={displayImage}
                alt="Preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg"
              />
              {preview && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearPreview();
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {preview ? 'Nova foto selecionada' : 'Clique ou arraste para alterar'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="p-4 rounded-full bg-muted">
              <ImageIcon className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">Arraste uma imagem ou clique para selecionar</p>
              <p className="text-xs mt-1">JPEG ou PNG, máximo 5MB</p>
              <p className="text-xs">Tamanho recomendado: 640x640px</p>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <Button 
          onClick={handleUpload} 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Fazer Upload da Foto
            </>
          )}
        </Button>
      )}
    </div>
  );
}
