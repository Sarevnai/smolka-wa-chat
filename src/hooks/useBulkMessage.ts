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

      // Simulate progress updates (in real implementation, this would come from the edge function via websockets or polling)
      let sent = 0;
      let failed = 0;
      const total = contacts.length;

      // Simulate progress with intervals
      const progressInterval = setInterval(() => {
        if (sent + failed < total) {
          // Simulate mostly successful sends with occasional failures
          if (Math.random() > 0.1) { // 90% success rate
            sent++;
          } else {
            failed++;
          }
          
          setProgress({ sent, failed, total });
        } else {
          clearInterval(progressInterval);
          
          // Set final results
          const finalResults: BulkMessageResults = {
            successful: data?.successful || sent,
            failed: data?.failed || failed,
            errors: data?.errors || []
          };
          
          setResults(finalResults);
          setIsLoading(false);
        }
      }, 2000); // Update every 2 seconds to simulate real sending

      // Clean up interval after 30 seconds max
      setTimeout(() => {
        clearInterval(progressInterval);
        if (isLoading) {
          setResults({
            successful: sent,
            failed: total - sent,
            errors: []
          });
          setIsLoading(false);
        }
      }, 30000);

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