import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type DepartmentType = Database["public"]["Enums"]["department_type"];

export interface ContactTag {
  id: string;
  name: string;
  color: string;
  department_code: DepartmentType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactTagAssignment {
  id: string;
  contact_id: string;
  tag_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface ContactWithTags {
  contact_id: string;
  tags: ContactTag[];
}

// Fetch all tags for a department
export function useContactTags(departmentCode: DepartmentType = 'marketing') {
  return useQuery({
    queryKey: ["contact-tags", departmentCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_tags")
        .select("*")
        .eq("department_code", departmentCode)
        .order("name");

      if (error) throw error;
      return data as ContactTag[];
    },
    enabled: !!departmentCode,
  });
}

// Fetch tags for a specific contact
export function useContactTagAssignments(contactId: string) {
  return useQuery({
    queryKey: ["contact-tag-assignments", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_tag_assignments")
        .select(`
          id,
          contact_id,
          tag_id,
          assigned_at,
          assigned_by,
          contact_tags (*)
        `)
        .eq("contact_id", contactId);

      if (error) throw error;
      return data.map(item => ({
        ...item,
        tag: (item as any).contact_tags as ContactTag
      }));
    },
    enabled: !!contactId,
  });
}

// Fetch all tag assignments for multiple contacts
export function useContactsTagAssignments(contactIds: string[]) {
  return useQuery({
    queryKey: ["contacts-tag-assignments", contactIds],
    queryFn: async () => {
      if (contactIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("contact_tag_assignments")
        .select(`
          id,
          contact_id,
          tag_id,
          assigned_at,
          contact_tags (*)
        `)
        .in("contact_id", contactIds);

      if (error) throw error;
      
      // Group by contact
      const byContact: Record<string, ContactTag[]> = {};
      data.forEach((item: any) => {
        if (!byContact[item.contact_id]) {
          byContact[item.contact_id] = [];
        }
        if (item.contact_tags) {
          byContact[item.contact_id].push(item.contact_tags);
        }
      });
      
      return byContact;
    },
    enabled: contactIds.length > 0,
  });
}

// Create a new tag
export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color, departmentCode }: { name: string; color: string; departmentCode: DepartmentType }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("contact_tags")
        .insert([{
          name,
          color,
          department_code: departmentCode,
          created_by: userData.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-tags", variables.departmentCode] });
      toast.success("Tag criada com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar tag: " + error.message);
    },
  });
}

// Update a tag
export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { data, error } = await supabase
        .from("contact_tags")
        .update({ name, color, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      toast.success("Tag atualizada");
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar tag: " + error.message);
    },
  });
}

// Delete a tag
export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-tags"] });
      queryClient.invalidateQueries({ queryKey: ["contact-tag-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-tag-assignments"] });
      toast.success("Tag excluída");
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir tag: " + error.message);
    },
  });
}

// Assign tag to contact
export function useAssignTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, tagId }: { contactId: string; tagId: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("contact_tag_assignments")
        .insert([{
          contact_id: contactId,
          tag_id: tagId,
          assigned_by: userData.user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-tag-assignments", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts-tag-assignments"] });
      toast.success("Tag adicionada ao contato");
    },
    onError: (error: Error) => {
      if (error.message.includes("duplicate")) {
        toast.info("Tag já está atribuída a este contato");
      } else {
        toast.error("Erro ao adicionar tag: " + error.message);
      }
    },
  });
}

// Remove tag from contact
export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactId, tagId }: { contactId: string; tagId: string }) => {
      const { error } = await supabase
        .from("contact_tag_assignments")
        .delete()
        .eq("contact_id", contactId)
        .eq("tag_id", tagId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contact-tag-assignments", variables.contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts-tag-assignments"] });
      toast.success("Tag removida do contato");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover tag: " + error.message);
    },
  });
}

// Bulk assign tags to multiple contacts
export function useBulkAssignTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contactIds, tagIds }: { contactIds: string[]; tagIds: string[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const assignments = contactIds.flatMap(contactId =>
        tagIds.map(tagId => ({
          contact_id: contactId,
          tag_id: tagId,
          assigned_by: userData.user?.id,
        }))
      );

      const { error } = await supabase
        .from("contact_tag_assignments")
        .upsert(assignments, { onConflict: 'contact_id,tag_id' });

      if (error) throw error;
      return { count: assignments.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contact-tag-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["contacts-tag-assignments"] });
      toast.success(`Tags atribuídas a ${data.count} contatos`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao atribuir tags: " + error.message);
    },
  });
}

// Count contacts per tag
export function useTagCounts(departmentCode: DepartmentType = 'marketing') {
  return useQuery({
    queryKey: ["tag-counts", departmentCode],
    queryFn: async () => {
      const { data: tags, error: tagsError } = await supabase
        .from("contact_tags")
        .select("id, name")
        .eq("department_code", departmentCode);

      if (tagsError) throw tagsError;

      const counts: Record<string, number> = {};
      
      for (const tag of tags || []) {
        const { count, error } = await supabase
          .from("contact_tag_assignments")
          .select("id", { count: 'exact', head: true })
          .eq("tag_id", tag.id);
        
        if (!error) {
          counts[tag.id] = count || 0;
        }
      }

      return counts;
    },
    enabled: !!departmentCode,
  });
}
