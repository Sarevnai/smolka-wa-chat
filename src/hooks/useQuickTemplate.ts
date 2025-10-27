import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { SUPABASE_PROJECT_URL } from "@/lib/supabaseClient";

interface QuickTemplateParams {
  phoneNumber: string;
  templateName: string;
  languageCode: string;
  variables: Record<string, string>;
  headerMediaId?: string;
}

export const useQuickTemplate = () => {
  const queryClient = useQueryClient();

  const sendTemplate = useMutation({
    mutationFn: async ({
      phoneNumber,
      templateName,
      languageCode,
      variables,
      headerMediaId
    }: QuickTemplateParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      // Detect variable mode (named vs numeric)
      const variableKeys = Object.keys(variables);
      const isNamedMode = variableKeys.some(key => !/^\d+$/.test(key));

      console.log(`Variables mode: ${isNamedMode ? 'NAMED' : 'NUMERIC'}`, variables);

      // Build components with variables
      const components: Array<{
        type: string;
        parameters?: Array<{
          type: string;
          text?: string;
          image?: { id: string };
          parameter_name?: string;
        }>;
      }> = [];

      // Add header component if media ID exists
      if (headerMediaId) {
        components.push({
          type: "header",
          parameters: [{
            type: "image",
            image: { id: headerMediaId }
          }]
        });
      }

      // Add body component with text variables
      if (variableKeys.length > 0) {
        components.push({
          type: "body",
          parameters: variableKeys.map(key => {
            const param: any = {
              type: "text",
              text: variables[key]
            };
            
            // Add parameter_name only for named variables
            if (isNamedMode) {
              param.parameter_name = key;
            }
            
            return param;
          })
        });
      }

      console.log("Sending template:", {
        to: phoneNumber,
        template_name: templateName,
        language_code: languageCode,
        components
      });

      const response = await fetch(
        `${SUPABASE_PROJECT_URL}/functions/v1/send-wa-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            to: phoneNumber,
            template_name: templateName,
            language_code: languageCode,
            components
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao enviar template");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Template enviado! ✅",
        description: "Janela de conversação aberta por 24 horas."
      });
      
      // Invalidate messages query to refresh chat
      queryClient.invalidateQueries({ queryKey: ["messages", variables.phoneNumber] });
      
      // Save to recent templates
      const recentTemplates = JSON.parse(
        localStorage.getItem('recent_templates') || '[]'
      );
      const updated = [
        variables.templateName,
        ...recentTemplates.filter((t: string) => t !== variables.templateName)
      ].slice(0, 5);
      localStorage.setItem('recent_templates', JSON.stringify(updated));
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar template",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return { 
    sendTemplate: sendTemplate.mutateAsync,
    isLoading: sendTemplate.isPending 
  };
};
