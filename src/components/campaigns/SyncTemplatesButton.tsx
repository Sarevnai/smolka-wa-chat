import { useState } from "react";
import { RefreshCw, Download } from "lucide-react";
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
      console.log('Starting template sync...');
      const { data, error } = await supabase.functions.invoke('sync-whatsapp-templates');

      console.log('Sync response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      // Invalidate WhatsApp templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });

      // Show detailed success/error information
      if (data?.success) {
        toast({
          title: "Sincronização concluída",
          description: data.message,
        });
        
        // Log debug info if available
        if (data.debug) {
          console.log('Sync debug info:', data.debug);
        }
        
        // Show detailed results if available
        if (data.results) {
          console.log('Sync results:', data.results);
          if (data.results.errors.length > 0) {
            console.warn('Sync errors:', data.results.errors);
          }
        }
      } else {
        throw new Error(data?.error || 'Resposta inválida da sincronização');
      }

    } catch (error: any) {
      console.error('Sync error details:', error);
      
      let errorMessage = 'Falha ao sincronizar templates da Meta.';
      let errorDetails = '';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      // Try to extract more details from the error
      if (error.context?.body) {
        try {
          const body = JSON.parse(error.context.body);
          if (body.debug) {
            errorDetails = `Debug: ${JSON.stringify(body.debug, null, 2)}`;
            console.log('Error debug info:', body.debug);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
      
      toast({
        title: "Erro na sincronização",
        description: errorDetails || errorMessage,
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