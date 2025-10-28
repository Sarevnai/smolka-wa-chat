import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contact, Contract, ContactStats, CreateContactRequest } from '@/types/contact';
import { ContactFiltersState } from '@/components/contacts/ContactFilters';
import { calculateContactRating } from '@/lib/contactRating';
import { normalizePhone, getPhoneSearchPattern } from '@/lib/phone-utils';

// Optimized hook for contact selection with pagination to load all contacts
export const useContactsForSelection = (searchTerm?: string, filters?: ContactFiltersState, limit = 2000) => {
  return useQuery({
    queryKey: ['contacts-selection', searchTerm, filters],
    queryFn: async () => {
      const allContacts = [];
      const pageSize = 200;
      let from = 0;
      let hasMore = true;

      while (hasMore && allContacts.length < limit) {
        let query = supabase
          .from('contacts')
          .select(`
            *,
            contact_contracts (*)
          `)
          .order('updated_at', { ascending: false })
          .range(from, from + pageSize - 1);

        // Apply search term - server-side search for better performance
        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.trim();
          const isPhoneSearch = /[\d+\-() ]/.test(term) && term.length >= 4;
          
          if (isPhoneSearch) {
            const phonePattern = getPhoneSearchPattern(term);
            // Phone search with normalized pattern
            query = query.or(`
              name.ilike.%${term}%,
              phone.ilike.%${phonePattern}%,
              email.ilike.%${term}%,
              contact_contracts.contract_number.ilike.%${term}%
            `);
          } else {
            // Regular text search
            query = query.or(`
              name.ilike.%${term}%,
              phone.ilike.%${term}%,
              email.ilike.%${term}%,
              contact_contracts.contract_number.ilike.%${term}%
            `);
          }
        }

        // Apply filters - server-side filtering
        if (filters?.status && Array.isArray(filters.status) && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }

        if (filters?.contactType && Array.isArray(filters.contactType) && filters.contactType.length > 0) {
          query = query.in('contact_type', filters.contactType);
        }

        if (filters?.rating) {
          query = query.gte('rating', filters.rating);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allContacts.push(...data);
          from += pageSize;
          hasMore = data.length === pageSize;
        }
      }

      // Transform data without expensive message queries
      let contacts = allContacts.map(contact => ({
        ...contact,
        contracts: contact.contact_contracts || [],
        totalMessages: 0, // Skip for performance
        lastContact: 'N/A' // Skip for performance
      })) as Contact[];

      // Apply client-side filters that require processed data
      if (filters?.hasContracts !== undefined) {
        contacts = contacts.filter(contact => {
          const hasContracts = contact.contracts && contact.contracts.length > 0;
          return filters.hasContracts ? hasContracts : !hasContracts;
        });
      }

      return contacts;
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
};

export const useContacts = (searchTerm?: string, filters?: ContactFiltersState) => {
  return useQuery({
    queryKey: ["contacts", searchTerm, filters],
    queryFn: async () => {
      console.log("Fetching contacts with optimized query...", { searchTerm, filters });

      // Build base query
      let query = supabase
        .from('contacts')
        .select(`
          *,
          contact_contracts (*)
        `)
        .order('updated_at', { ascending: false });

      // Apply search term
      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.trim();
        
        // Check if search term looks like a phone number
        const isPhoneSearch = /[\d+\-() ]/.test(term) && term.length >= 4;
        
        if (isPhoneSearch) {
          // Phone search: normalize and search by digits only
          const phonePattern = getPhoneSearchPattern(term);
          query = query.or(`
            name.ilike.%${term}%,
            phone.ilike.%${phonePattern}%,
            email.ilike.%${term}%
          `);
        } else {
          // Text search: normal search
          query = query.or(`
            name.ilike.%${term}%,
            phone.ilike.%${term}%,
            email.ilike.%${term}%
          `);
        }
      }

      // Apply filters
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.contactType) {
        query = query.eq('contact_type', filters.contactType);
      }

      if (filters?.rating) {
        query = query.gte('rating', filters.rating);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        return [];
      }

      // Optimized: Get message stats in ONE aggregated query
      const phoneNumbers = data.map(contact => contact.phone);
      
      // Use Supabase RPC function for aggregated stats
      const { data: messageStats } = await supabase
        .rpc('get_contact_message_stats', { phone_numbers: phoneNumbers });

      // Create stats map for quick lookup
      const statsMap = new Map();
      if (messageStats) {
        messageStats.forEach((stat: any) => {
          statsMap.set(stat.phone, {
            totalMessages: stat.total_messages,
            lastTimestamp: stat.last_timestamp
          });
        });
      }

      // Map contacts with stats
      let contactsWithStats = data.map(contact => {
        const stats = statsMap.get(contact.phone) || { 
          totalMessages: 0, 
          lastTimestamp: null 
        };

        // Calculate automatic rating based on engagement
        const activeContracts = (contact.contact_contracts || []).filter(
          (c: any) => c.status === 'ativo'
        ).length;
        
        const autoRating = calculateContactRating({
          totalMessages: Number(stats.totalMessages),
          lastMessageTimestamp: stats.lastTimestamp,
          activeContracts
        });

        return {
          ...contact,
          contracts: contact.contact_contracts || [],
          totalMessages: Number(stats.totalMessages),
          lastContact: stats.lastTimestamp 
            ? formatLastContact(stats.lastTimestamp)
            : "Sem mensagens",
          lastMessageTimestamp: stats.lastTimestamp,
          // Use manual rating if set, otherwise use auto-calculated rating
          rating: contact.rating || autoRating
        } as Contact & { lastMessageTimestamp: string | null };
      });

      // Apply client-side filters
      if (filters?.hasContracts !== undefined) {
        contactsWithStats = contactsWithStats.filter(contact => {
          const hasContracts = contact.contracts && contact.contracts.length > 0;
          return filters.hasContracts ? hasContracts : !hasContracts;
        });
      }

      if (filters?.hasRecentActivity !== undefined) {
        contactsWithStats = contactsWithStats.filter((contact: any) => {
          if (!contact.lastMessageTimestamp) {
            return !filters.hasRecentActivity;
          }
          
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const lastMessageDate = new Date(contact.lastMessageTimestamp);
          const isRecent = lastMessageDate >= thirtyDaysAgo;
          
          return filters.hasRecentActivity ? isRecent : !isRecent;
        });
      }

      console.log(`Fetched ${contactsWithStats.length} contacts with stats in optimized query`);
      return contactsWithStats;
    },
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
          contact_type: request.contact_type,
          notes: request.notes,
          rating: request.rating,
          description: request.description,
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
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone'] });
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
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone'] });
    }
  });
};

export const useDeleteContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      if (!contactId) {
        throw new Error('ID do contato é obrigatório');
      }

      console.log('Deleting contact with ID:', contactId);

      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Check if contact exists and has tickets that prevent deletion
      const { data: ticketsCheck } = await supabase
        .from('tickets')
        .select('id')
        .eq('contact_id', contactId)
        .limit(1);

      if (ticketsCheck && ticketsCheck.length > 0) {
        throw new Error('Não é possível excluir este contato pois ele possui tickets associados.');
      }

      // Delete contracts first (cascade delete)
      const { error: contractsError } = await supabase
        .from('contact_contracts')
        .delete()
        .eq('contact_id', contactId);

      if (contractsError) {
        console.error('Error deleting contracts:', contractsError);
        throw new Error(`Erro ao excluir contratos: ${contractsError.message}`);
      }

      // Delete contact
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (contactError) {
        console.error('Error deleting contact:', contactError);
        throw new Error(`Erro ao excluir contato: ${contactError.message}`);
      }

      console.log('Contact deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('useDeleteContact mutation error:', error);
    }
  });
};

export const useContactByPhone = (phone?: string) => {
  return useQuery({
    queryKey: ['contact-by-phone', phone],
    queryFn: async () => {
      if (!phone) return null;
      
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          contact_contracts (*)
        `)
        .eq('phone', phone)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      // Get message count and last contact
      const { data: messageStats } = await supabase
        .from('messages')
        .select('id, wa_timestamp')
        .eq('wa_from', phone)
        .order('wa_timestamp', { ascending: false })
        .limit(1);

      const { count: totalMessages } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('wa_from', phone);

      const lastMessage = messageStats?.[0];
      const lastContact = lastMessage?.wa_timestamp 
        ? formatLastContact(lastMessage.wa_timestamp)
        : 'Nunca';

      // Calculate automatic rating
      const activeContracts = (data.contact_contracts || []).filter(
        (c: any) => c.status === 'ativo'
      ).length;
      
      const autoRating = calculateContactRating({
        totalMessages: totalMessages || 0,
        lastMessageTimestamp: lastMessage?.wa_timestamp || null,
        activeContracts
      });

      return {
        ...data,
        contracts: data.contact_contracts || [],
        totalMessages: totalMessages || 0,
        lastContact,
        rating: data.rating || autoRating
      } as Contact;
    },
    enabled: !!phone,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUpdateContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, updates }: { 
      contactId: string; 
      updates: Partial<Pick<Contact, 'name' | 'phone' | 'email' | 'status' | 'contact_type' | 'notes' | 'rating' | 'description'>>
    }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
      queryClient.invalidateQueries({ queryKey: ['contact-by-phone'] });
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