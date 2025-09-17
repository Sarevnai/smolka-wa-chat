import { useState } from "react";
import { RefreshCw, Download, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export default function SyncTemplatesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setIsLoading(true);
    
    try {
      console.log('Iniciando sincronização de templates...');
      
      toast({
        title: "Sincronização iniciada",
        description: "Conectando com a Meta API...",
      });

      const { data, error } = await supabase.functions.invoke('sync-whatsapp-templates');

      console.log('Resposta da sincronização:', { data, error });

      if (error) {
        console.error('Erro na função Supabase:', error);
        throw error;
      }

      // Invalidate WhatsApp templates query to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });

      if (data?.success) {
        toast({
          title: "Sincronização bem-sucedida! ✅",
          description: data.message,
        });
        
        if (data.results?.synced > 0) {
          console.log(`${data.results.synced} templates sincronizados:`, data.results.templates);
        }
        
      } else {
        // Handle business logic errors
        console.error('Erro de negócio:', data);
        
        toast({
          title: "Problema na sincronização ⚠️",
          description: data?.error || data?.message || 'Erro desconhecido na sincronização',
          variant: "destructive",
        });
        
        if (data?.details) {
          console.error('Detalhes do erro:', data.details);
        }
      }

    } catch (error: any) {
      console.error('Erro crítico na sincronização:', error);
      
      let errorMessage = 'Falha na comunicação com o servidor.';
      let errorDescription = '';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      if (error.context?.body) {
        try {
          const body = JSON.parse(error.context.body);
          if (body.error) {
            errorMessage = body.error;
            errorDescription = body.details || '';
          }
        } catch (e) {
          console.log('Erro ao parsear contexto do erro');
        }
      }
      
      toast({
        title: "Erro na sincronização ❌",
        description: errorDescription || errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          Sincronizando...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Sincronizar Templates
        </>
      )}
    </Button>
  );
}