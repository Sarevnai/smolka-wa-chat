import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UploadResult {
  publicUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function useMediaUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File): Promise<UploadResult | null> => {
    if (!file) return null;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + Math.random() * 20;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);

      // Upload via edge function
      const { data, error } = await supabase.functions.invoke('upload-media', {
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Erro no upload",
          description: "Não foi possível enviar o arquivo. Tente novamente.",
          variant: "destructive",
        });
        return null;
      }

      return data as UploadResult;

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const sendMediaMessage = async (
    to: string, 
    mediaUrl: string, 
    mediaType: string, 
    caption?: string, 
    filename?: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('send-wa-media', {
        body: {
          to,
          mediaUrl,
          mediaType,
          caption,
          filename
        }
      });

      if (error) {
        console.error('Send media error:', error);
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível enviar o arquivo via WhatsApp.",
          variant: "destructive",
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Send media error:', error);
      toast({
        title: "Erro ao enviar",
        description: "Não foi possível enviar o arquivo via WhatsApp.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    uploadFile,
    sendMediaMessage,
    isUploading,
    uploadProgress
  };
}