import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Contact, Contract, ContactStats, CreateContactRequest } from '@/types/contact';

export const useContacts = (searchTerm?: string) => {
  return useQuery({
    queryKey: ['contacts', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select(`
          *,
          contact_contracts (*)
        `)
        .order('updated_at', { ascending: false });

      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        // Search in name, phone, email, or contract number
        query = query.or(`
          name.ilike.%${term}%,
          phone.ilike.%${term}%,
          email.ilike.%${term}%,
          contact_contracts.contract_number.ilike.%${term}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enhance contacts with message statistics
      const contactsWithStats = await Promise.all(
        data.map(async (contact) => {
          // Get message count and last contact
          const { data: messageStats } = await supabase
            .from('messages')
            .select('id, wa_timestamp')
            .eq('wa_from', contact.phone)
            .order('wa_timestamp', { ascending: false })
            .limit(1);

          const { count: totalMessages } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('wa_from', contact.phone);

          const lastMessage = messageStats?.[0];
          const lastContact = lastMessage?.wa_timestamp 
            ? formatLastContact(lastMessage.wa_timestamp)
            : 'Nunca';

          return {
            ...contact,
            contracts: contact.contact_contracts || [],
            totalMessages: totalMessages || 0,
            lastContact
          } as Contact;
        })
      );

      return contactsWithStats;
    }
  });
};

export const useContactStats = () => {
  return useQuery({
    queryKey: ['contact-stats'],
    queryFn: async () => {
      const [contactsResult, contractsResult, activeContactsResult, activeContractsResult] = await Promise.all([
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('contact_contracts').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
        supabase.from('contact_contracts').select('*', { count: 'exact', head: true }).eq('status', 'ativo')
      ]);

      return {
        totalContacts: contactsResult.count || 0,
        activeContacts: activeContactsResult.count || 0,
        totalContracts: contractsResult.count || 0,
        activeContracts: activeContractsResult.count || 0
      } as ContactStats;
    }
  });
};

export const useCreateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateContactRequest) => {
      // Create contact first
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: request.name,
          phone: request.phone,
          email: request.email,
          status: 'ativo'
        })
        .select()
        .single();

      if (contactError) throw contactError;

      // Create contracts if provided
      if (request.contracts && request.contracts.length > 0) {
        const contractsToInsert = request.contracts.map(contract => ({
          contact_id: contact.id,
          contract_number: contract.contract_number,
          contract_type: contract.contract_type,
          property_code: contract.property_code,
          status: contract.status || 'ativo'
        }));

        const { error: contractsError } = await supabase
          .from('contact_contracts')
          .insert(contractsToInsert);

        if (contractsError) throw contractsError;
      }

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
    }
  });
};

export const useAddContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, contract }: { 
      contactId: string; 
      contract: Omit<Contract, 'id' | 'contact_id' | 'created_at' | 'updated_at'> 
    }) => {
      const { data, error } = await supabase
        .from('contact_contracts')
        .insert({
          contact_id: contactId,
          contract_number: contract.contract_number,
          contract_type: contract.contract_type,
          property_code: contract.property_code,
          status: contract.status || 'ativo'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
    }
  });
};

function formatLastContact(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
  
  return `${Math.floor(diffDays / 365)} anos atrás`;
}