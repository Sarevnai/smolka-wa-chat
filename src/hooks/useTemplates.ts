import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageTemplate } from "@/types/campaign";
import { useToast } from "@/hooks/use-toast";

export const useTemplates = () => {
  return useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (template: Omit<MessageTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("message_templates")
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("message_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir template",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

// Built-in templates that don't require database storage
export const getBuiltInTemplates = (): MessageTemplate[] => [
  {
    id: "builtin-cobranca-1",
    name: "Cobrança - Lembrete Amigável",
    category: "cobranca",
    content: "Olá {{nome}}, tudo bem? Este é um lembrete amigável sobre o vencimento do contrato {{contrato}} no valor de R$ {{valor}}. Em caso de dúvidas, entre em contato conosco.",
    variables: ["nome", "contrato", "valor"],
    description: "Template padrão para lembretes de cobrança",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "builtin-manutencao-1",
    name: "Manutenção - Aviso Preventivo",
    category: "manutencao",
    content: "Prezado(a) {{nome}}, informamos que será realizada manutenção preventiva no imóvel {{endereco}} no dia {{data}} às {{horario}}. Por favor, nos confirme sua disponibilidade.",
    variables: ["nome", "endereco", "data", "horario"],
    description: "Template para avisos de manutenção",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "builtin-comunicado-1", 
    name: "Comunicado - Informações Gerais",
    category: "comunicado",
    content: "Olá {{nome}}! Temos uma informação importante sobre o seu imóvel. {{mensagem}} Para mais detalhes, entre em contato conosco.",
    variables: ["nome", "mensagem"],
    description: "Template genérico para comunicados",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];