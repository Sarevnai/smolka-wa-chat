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
      const { data, error } = await supabase.functions.invoke('sync-whatsapp-templates');

      if (error) {
        throw error;
      }

      // Invalidate WhatsApp templates query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });

      toast({
        title: "Templates sincronizados!",
        description: data.message || "Templates da Meta foram atualizados com sucesso.",
      });

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Falha ao sincronizar templates da Meta.",
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