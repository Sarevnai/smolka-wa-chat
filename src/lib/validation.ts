import { MessageTemplate } from "@/types/campaign";
import { WhatsAppTemplate, isOfficialWhatsAppTemplate, getTemplatePreview } from "@/hooks/useWhatsAppTemplates";

// Phone number validation utilities
export const normalizePhoneNumber = (phone: string): string => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Add country code if missing (assume Brazil +55)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    // Remove leading 0 and add 55
    return '55' + digitsOnly.substring(1);
  } else if (digitsOnly.length === 11) {
    // Add country code
    return '55' + digitsOnly;
  } else if (digitsOnly.length === 13 && digitsOnly.startsWith('55')) {
    // Already has country code
    return digitsOnly;
  }
  
  return digitsOnly;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  
  // Brazilian phone numbers: +55 + 2 digits (area code) + 8-9 digits (number)
  // Should be 12-13 digits total after normalization
  return /^55\d{10,11}$/.test(normalized);
};

export const formatPhoneForDisplay = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  
  if (normalized.length === 13) {
    // +55 11 99999-9999
    return `+${normalized.substring(0, 2)} (${normalized.substring(2, 4)}) ${normalized.substring(4, 5)} ${normalized.substring(5, 9)}-${normalized.substring(9)}`;
  } else if (normalized.length === 12) {
    // +55 11 9999-9999  
    return `+${normalized.substring(0, 2)} (${normalized.substring(2, 4)}) ${normalized.substring(4, 8)}-${normalized.substring(8)}`;
  }
  
  return phone; // Return original if can't format
};

// Campaign validation utilities
export interface CampaignValidationError {
  field: string;
  message: string;
}

export const validateCampaignMessage = (
  template: MessageTemplate | WhatsAppTemplate | null,
  customMessage: string
): string[] => {
  const errors: string[] = [];
  
  if (template) {
    if (isOfficialWhatsAppTemplate(template)) {
      // Validate WhatsApp template
      const preview = getTemplatePreview(template);
      
      if (!preview || preview.trim().length === 0) {
        errors.push("Template do WhatsApp selecionado não possui conteúdo válido");
      }
      
      if (template.status !== 'active') {
        errors.push(`Template "${template.template_name}" não está aprovado (Status: ${template.status})`);
      }
    } else {
      // Validate internal template
      if (!template.content || template.content.trim().length === 0) {
        errors.push("Template selecionado não possui conteúdo");
      }
    }
  } else {
    // Validate custom message
    if (!customMessage || customMessage.trim().length === 0) {
      errors.push("Mensagem personalizada não pode estar vazia");
    }
    
    if (customMessage.length > 1000) {
      errors.push("Mensagem muito longa (máximo 1000 caracteres)");
    }
  }
  
  return errors;
};

export const validateCampaignContacts = (
  contactIds: string[],
  contactsData?: { id: string; phone: string; name?: string }[]
): string[] => {
  const errors: string[] = [];
  
  if (contactIds.length === 0) {
    errors.push("Selecione pelo menos um contato");
    return errors;
  }
  
  if (contactIds.length > 1000) {
    errors.push("Máximo de 1000 contatos por campanha");
  }
  
  // Validate phone numbers if contact data is available
  if (contactsData) {
    const invalidPhones = contactsData.filter(contact => 
      !isValidPhoneNumber(contact.phone)
    );
    
    if (invalidPhones.length > 0) {
      if (invalidPhones.length === 1) {
        errors.push(`Contato "${invalidPhones[0].name || invalidPhones[0].phone}" possui número inválido`);
      } else {
        errors.push(`${invalidPhones.length} contatos possuem números de telefone inválidos`);
      }
    }
  }
  
  return errors;
};

export const validateCampaignBasics = (
  campaignName: string,
  scheduledAt?: Date | null
): string[] => {
  const errors: string[] = [];
  
  if (!campaignName || campaignName.trim().length === 0) {
    errors.push("Nome da campanha é obrigatório");
  }
  
  if (campaignName.length > 100) {
    errors.push("Nome da campanha muito longo (máximo 100 caracteres)");
  }
  
  if (scheduledAt && scheduledAt <= new Date()) {
    errors.push("Data de agendamento deve ser no futuro");
  }
  
  return errors;
};

export const validateFullCampaign = (params: {
  campaignName: string;
  template: MessageTemplate | WhatsAppTemplate | null;
  customMessage: string;
  contactIds: string[];
  scheduledAt?: Date | null;
  contactsData?: { id: string; phone: string; name?: string }[];
}): string[] => {
  const {
    campaignName,
    template,
    customMessage,
    contactIds,
    scheduledAt,
    contactsData
  } = params;
  
  return [
    ...validateCampaignBasics(campaignName, scheduledAt),
    ...validateCampaignMessage(template, customMessage),
    ...validateCampaignContacts(contactIds, contactsData)
  ];
};