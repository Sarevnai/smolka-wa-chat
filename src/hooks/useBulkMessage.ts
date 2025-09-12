import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contact";
import { useToast } from "@/hooks/use-toast";

interface BulkMessageParams {
  contacts: Contact[];
  message: string;
}

interface BulkMessageProgress {
  sent: number;
  failed: number;
  total: number;
}

interface BulkMessageResults {
  successful: number;
  failed: number;
  errors: Array<{ phone: string; error: string }>;
}

export function useBulkMessage() {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<BulkMessageProgress | null>(null);
  const [results, setResults] = useState<BulkMessageResults | null>(null);
  const { toast } = useToast();

  const sendBulkMessage = async ({ contacts, message }: BulkMessageParams) => {
    setIsLoading(true);
    setProgress({ sent: 0, failed: 0, total: contacts.length });
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-messages', {
        body: {
          contacts: contacts.map(contact => ({
            phone: contact.phone,
            name: contact.name
          })),
          message
        }
      });

      if (error) {
        console.error('Error sending bulk messages:', error);
        throw new Error(error.message || 'Erro ao enviar mensagens');
      }

      // Use actual data from edge function
      const finalResults: BulkMessageResults = {
        successful: data?.successful || 0,
        failed: data?.failed || 0,
        errors: data?.errors || []
      };

      // Set progress to complete
      setProgress({ 
        sent: finalResults.successful, 
        failed: finalResults.failed, 
        total: contacts.length 
      });
      
      setResults(finalResults);
      setIsLoading(false);

    } catch (error: any) {
      console.error('Bulk message error:', error);
      setResults({
        successful: 0,
        failed: contacts.length,
        errors: [{ phone: 'all', error: error.message }]
      });
      setIsLoading(false);
      throw error;
    }
  };

  return {
    sendBulkMessage,
    isLoading,
    progress,
    results
  };
}