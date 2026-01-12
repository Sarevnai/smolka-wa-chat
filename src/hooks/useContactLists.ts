import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  contact_ids: string[];
  filters: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactListInput {
  name: string;
  description?: string;
  contact_ids: string[];
}

export interface UpdateContactListInput {
  id: string;
  name?: string;
  description?: string;
  contact_ids?: string[];
}

// Fetch all contact lists
export const useContactLists = () => {
  return useQuery({
    queryKey: ['contact-lists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as ContactList[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Fetch a single contact list by ID
export const useContactListById = (id: string | null) => {
  return useQuery({
    queryKey: ['contact-list', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as ContactList;
    },
    enabled: !!id,
  });
};

// Create a new contact list
export const useCreateContactList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateContactListInput) => {
      const { data, error } = await supabase
        .from('contact_groups')
        .insert({
          name: input.name,
          description: input.description || null,
          contact_ids: input.contact_ids,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ContactList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast({
        title: "Lista criada",
        description: "A lista de contatos foi criada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar lista",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Update an existing contact list
export const useUpdateContactList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateContactListInput) => {
      const updates: Partial<ContactList> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.contact_ids !== undefined) updates.contact_ids = input.contact_ids;

      const { data, error } = await supabase
        .from('contact_groups')
        .update(updates)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;
      return data as ContactList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      queryClient.invalidateQueries({ queryKey: ['contact-list', data.id] });
      toast({
        title: "Lista atualizada",
        description: "A lista de contatos foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar lista",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Delete a contact list
export const useDeleteContactList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      toast({
        title: "Lista excluída",
        description: "A lista de contatos foi excluída com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir lista",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Add contacts to a list
export const useAddContactsToList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, contactIds }: { listId: string; contactIds: string[] }) => {
      // First get current contacts
      const { data: current, error: fetchError } = await supabase
        .from('contact_groups')
        .select('contact_ids')
        .eq('id', listId)
        .single();

      if (fetchError) throw fetchError;

      // Merge without duplicates
      const existingIds = current?.contact_ids || [];
      const mergedIds = [...new Set([...existingIds, ...contactIds])];

      const { data, error } = await supabase
        .from('contact_groups')
        .update({ contact_ids: mergedIds })
        .eq('id', listId)
        .select()
        .single();

      if (error) throw error;
      return data as ContactList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      queryClient.invalidateQueries({ queryKey: ['contact-list', data.id] });
    },
  });
};

// Remove contacts from a list
export const useRemoveContactsFromList = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, contactIds }: { listId: string; contactIds: string[] }) => {
      // First get current contacts
      const { data: current, error: fetchError } = await supabase
        .from('contact_groups')
        .select('contact_ids')
        .eq('id', listId)
        .single();

      if (fetchError) throw fetchError;

      // Remove specified contacts
      const existingIds = current?.contact_ids || [];
      const filteredIds = existingIds.filter(id => !contactIds.includes(id));

      const { data, error } = await supabase
        .from('contact_groups')
        .update({ contact_ids: filteredIds })
        .eq('id', listId)
        .select()
        .single();

      if (error) throw error;
      return data as ContactList;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] });
      queryClient.invalidateQueries({ queryKey: ['contact-list', data.id] });
    },
  });
};
