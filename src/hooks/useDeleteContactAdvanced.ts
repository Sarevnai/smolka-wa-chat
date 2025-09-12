import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ContactDeletionCounts {
  tickets: number;
  contracts: number;
  messages: number;
}

export interface DeleteContactOptions {
  detachTickets?: boolean;
  deleteTickets?: boolean;
  purgeMessages?: boolean;
}

export function useDeleteContactAdvanced() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const getContactCounts = async (contactId: string, phoneNumber?: string): Promise<ContactDeletionCounts> => {
    const [ticketsResult, contractsResult, messagesResult] = await Promise.all([
      supabase.from('tickets').select('id', { count: 'exact' }).eq('contact_id', contactId),
      supabase.from('contact_contracts').select('id', { count: 'exact' }).eq('contact_id', contactId),
      phoneNumber ? supabase.from('messages').select('id', { count: 'exact' }).or(`wa_from.eq."${phoneNumber}",wa_to.eq."${phoneNumber}"`) : { count: 0 }
    ]);

    return {
      tickets: ticketsResult.count || 0,
      contracts: contractsResult.count || 0,
      messages: messagesResult.count || 0
    };
  };

  const deleteContactMutation = useMutation({
    mutationFn: async ({ contactId, phoneNumber, options }: { 
      contactId: string; 
      phoneNumber?: string; 
      options: DeleteContactOptions 
    }) => {
      if (!contactId) {
        throw new Error('ID do contato é obrigatório');
      }

      console.log('Starting advanced contact deletion:', { contactId, phoneNumber, options });

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      let deletedCounts = { tickets: 0, contracts: 0, messages: 0 };

      // Handle tickets based on options
      if (options.deleteTickets) {
        const { count, error } = await supabase
          .from('tickets')
          .delete({ count: 'exact' })
          .eq('contact_id', contactId);
        
        if (error) throw new Error(`Erro ao excluir tickets: ${error.message}`);
        deletedCounts.tickets = count || 0;
      } else if (options.detachTickets) {
        const { count, error } = await supabase
          .from('tickets')
          .update({ contact_id: null }, { count: 'exact' })
          .eq('contact_id', contactId);
        
        if (error) throw new Error(`Erro ao desvincular tickets: ${error.message}`);
        deletedCounts.tickets = count || 0;
      } else {
        // Check if there are tickets that would prevent deletion
        const { data: tickets } = await supabase
          .from('tickets')
          .select('id')
          .eq('contact_id', contactId)
          .limit(1);

        if (tickets && tickets.length > 0) {
          throw new Error('Não é possível excluir este contato pois ele possui tickets associados. Use a opção de desvincular ou excluir tickets.');
        }
      }

      // Delete contracts
      const { count: contractsCount, error: contractsError } = await supabase
        .from('contact_contracts')
        .delete({ count: 'exact' })
        .eq('contact_id', contactId);

      if (contractsError) {
        throw new Error(`Erro ao excluir contratos: ${contractsError.message}`);
      }
      deletedCounts.contracts = contractsCount || 0;

      // Handle messages if requested
      if (options.purgeMessages && phoneNumber) {
        // Normalize phone number
        const normalizedPhone = phoneNumber.replace(/\D/g, '');
        
        // Delete messages in two parallel operations for better reliability
        const [fromResult, toResult] = await Promise.all([
          supabase.from('messages').delete({ count: 'exact' }).eq('wa_from', phoneNumber),
          supabase.from('messages').delete({ count: 'exact' }).eq('wa_to', phoneNumber)
        ]);

        if (fromResult.error) throw new Error(`Erro ao excluir mensagens (from): ${fromResult.error.message}`);
        if (toResult.error) throw new Error(`Erro ao excluir mensagens (to): ${toResult.error.message}`);
        
        deletedCounts.messages = (fromResult.count || 0) + (toResult.count || 0);
      }

      // Finally, delete the contact
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (contactError) {
        throw new Error(`Erro ao excluir contato: ${contactError.message}`);
      }

      console.log('Contact deleted successfully with counts:', deletedCounts);
      return deletedCounts;
    },
    onSuccess: (deletedCounts, { phoneNumber }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      
      if (phoneNumber) {
        queryClient.invalidateQueries({ queryKey: ['contact-by-phone', phoneNumber] });
      }

      // Show detailed success message
      const summary = [];
      if (deletedCounts.tickets > 0) summary.push(`${deletedCounts.tickets} ticket(s)`);
      if (deletedCounts.contracts > 0) summary.push(`${deletedCounts.contracts} contrato(s)`);
      if (deletedCounts.messages > 0) summary.push(`${deletedCounts.messages} mensagem(ns)`);

      toast({
        title: "Contato excluído com sucesso",
        description: summary.length > 0 
          ? `Também foram processados: ${summary.join(', ')}`
          : "Contato excluído sem dependências.",
      });
    },
    onError: (error: any) => {
      console.error('useDeleteContactAdvanced error:', error);
      toast({
        title: "Erro ao excluir contato",
        description: error.message || "Erro desconhecido ao excluir contato.",
        variant: "destructive",
      });
    }
  });

  return {
    deleteContact: deleteContactMutation.mutateAsync,
    isDeleting: deleteContactMutation.isPending,
    getContactCounts
  };
}