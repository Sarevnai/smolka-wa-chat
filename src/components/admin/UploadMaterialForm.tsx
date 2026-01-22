import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCreateMaterial, MaterialType, MATERIAL_TYPE_LABELS } from '@/hooks/useDevelopmentMaterials';
import { Upload, X, FileImage, FileVideo, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface UploadMaterialFormProps {
  developmentId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const ACCEPTED_TYPES: Record<MaterialType, string> = {
  planta: 'image/jpeg,image/png,image/webp',
  perspectiva: 'image/jpeg,image/png,image/webp',
  video: 'video/mp4,video/quicktime',
  documento: 'application/pdf',
  foto: 'image/jpeg,image/png,image/webp'
};

export default function UploadMaterialForm({ developmentId, onSuccess, onCancel }: UploadMaterialFormProps) {
  const [materialType, setMaterialType] = useState<MaterialType>('planta');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, uploadProgress } = useMediaUpload();
  const createMaterial = useCreateMaterial();

  const handleFileSelect = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }
    
    setSelectedFile(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }
    if (!title.trim()) {
      toast.error('Informe o título do material');
      return;
    }

    try {
      const uploadResult = await uploadFile(selectedFile);
      if (!uploadResult) return;

      await createMaterial.mutateAsync({
        development_id: developmentId,
        material_type: materialType,
        title: title.trim(),
        description: description.trim() || null,
        file_url: uploadResult.publicUrl,
        file_type: uploadResult.mimeType,
        order_index: 0,
        is_featured: isFeatured,
        whatsapp_media_id: null
      });

      toast.success('Material adicionado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error creating material:', error);
      toast.error('Erro ao salvar material');
    }
  };

  const getIcon = () => {
    if (materialType === 'video') return <FileVideo className="h-8 w-8 text-muted-foreground" />;
    if (materialType === 'documento') return <FileText className="h-8 w-8 text-muted-foreground" />;
    return <FileImage className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Material Type */}
      <div className="space-y-2">
        <Label>Tipo de Material</Label>
        <Select value={materialType} onValueChange={(v) => setMaterialType(v as MaterialType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MATERIAL_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Arquivo</Label>
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES[materialType]}
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />
          
          {selectedFile ? (
            <div className="flex items-center gap-4">
              {preview ? (
                <img src={preview} alt="Preview" className="h-20 w-20 object-cover rounded" />
              ) : (
                <div className="h-20 w-20 bg-muted rounded flex items-center justify-center">
                  {getIcon()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  setPreview(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo ou clique para selecionar
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo 20MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label>Título *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Planta 2 Quartos - 65m²"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label>Descrição (opcional)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Informações adicionais sobre o material..."
          rows={3}
        />
      </div>

      {/* Featured Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Material Destacado</Label>
          <p className="text-sm text-muted-foreground">Será priorizado pela IA ao enviar materiais</p>
        </div>
        <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Enviando... {Math.round(uploadProgress)}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isUploading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={isUploading || createMaterial.isPending}>
          {(isUploading || createMaterial.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Adicionar Material
        </Button>
      </div>
    </div>
  );
}
