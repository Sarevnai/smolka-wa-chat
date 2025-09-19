import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppTemplate {
  id: string;
  template_id: string;
  template_name: string;
  category: string;
  language: string;
  status: 'active' | 'pending' | 'rejected' | 'disabled';
  components: {
    type: string;
    format?: string;
    text?: string;
    parameters?: Array<{
      type: string;
      text?: string;
    }>;
  }[];
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateRequest {
  template_name: string;
  language_code: string;
  components: Array<{
    type: string;
    parameters?: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

// Helper function to validate if template_id is numeric (valid)
const isValidTemplateId = (templateId: string): boolean => {
  return /^\d+$/.test(templateId);
};

export const useWhatsAppTemplates = () => {
  return useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("status", "active")
        .order("template_name", { ascending: true });

      if (error) throw error;
      
      // Filter out templates with invalid template_ids on frontend
      const validTemplates = (data || []).filter(template => 
        isValidTemplateId(template.template_id)
      );
      
      return validTemplates as WhatsAppTemplate[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes since templates don't change often
  });
};

export const useWhatsAppTemplateById = (templateId?: string) => {
  return useQuery({
    queryKey: ["whatsapp-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("template_id", templateId)
        .single();

      if (error) throw error;
      return data as WhatsAppTemplate;
    },
    enabled: !!templateId,
  });
};

// Helper function to get template preview with sample data
export const getTemplatePreview = (template: WhatsAppTemplate): string => {
  console.log('Generating preview for template:', template.template_name, template.components);
  
  if (!template.components || template.components.length === 0) {
    console.log('No components found, returning template name');
    return template.template_name || "Template sem conteúdo";
  }

  const bodyComponent = template.components.find(c => c.type === 'BODY');
  if (!bodyComponent?.text) {
    console.log('No body component found, returning template name');
    return template.template_name || "Template sem texto principal";
  }

  let preview = bodyComponent.text;
  
  // Replace placeholders with sample data
  const sampleData = {
    '1': 'João Silva',
    '2': 'Contrato 12345',
    '3': 'R$ 1.200,00',
    '4': 'Rua das Flores, 123',
    '5': '25/01/2024',
    '6': '14:00'
  };

  // Replace WhatsApp template placeholders {{1}}, {{2}}, etc.
  preview = preview.replace(/\{\{(\d+)\}\}/g, (match, num) => {
    return `[${sampleData[num as keyof typeof sampleData] || `Parâmetro ${num}`}]`;
  });

  console.log('Generated preview:', preview);
  return preview;
};

// Helper function to check if template requires official WhatsApp approval
export const isOfficialWhatsAppTemplate = (template: any): template is WhatsAppTemplate => {
  return template && 'template_id' in template && 'status' in template;
};

// Helper function to validate if template can be used for proactive messaging
export const canUseForProactiveMessaging = (template: WhatsAppTemplate): boolean => {
  return template.status === 'active' && 
         ['UTILITY', 'MARKETING', 'AUTHENTICATION'].includes(template.category.toUpperCase());
};