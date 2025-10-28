import { MessageRow } from "./messages";

/**
 * Formata uma mensagem para encaminhamento
 * Adiciona o prefixo "📩 *Encaminhado*" seguido da mensagem adicional (se houver)
 */
export function formatForwardedMessage(
  originalMessage: MessageRow,
  additionalText?: string
): string {
  const forwardPrefix = "📩 *Encaminhado*";
  
  // Se for mídia com caption
  if (originalMessage.media_caption) {
    const parts = [forwardPrefix];
    if (additionalText?.trim()) {
      parts.push(additionalText.trim());
    }
    parts.push("---");
    parts.push(originalMessage.media_caption);
    return parts.join("\n");
  }
  
  // Se for mensagem de texto
  if (originalMessage.body) {
    const parts = [forwardPrefix];
    if (additionalText?.trim()) {
      parts.push(additionalText.trim());
    }
    parts.push("---");
    parts.push(originalMessage.body);
    return parts.join("\n");
  }
  
  // Se for apenas mídia sem caption
  if (additionalText?.trim()) {
    return `${forwardPrefix}\n${additionalText.trim()}`;
  }
  
  return forwardPrefix;
}

/**
 * Verifica se uma mensagem é do tipo mídia
 */
export function isMediaMessage(message: MessageRow): boolean {
  return !!(message.media_type && message.media_url);
}

/**
 * Obtém o tipo de mídia do WhatsApp baseado no media_type
 */
export function getWhatsAppMediaType(mediaType: string): string {
  if (mediaType.startsWith('image/')) return 'image';
  if (mediaType.startsWith('video/')) return 'video';
  if (mediaType.startsWith('audio/')) return 'audio';
  return 'document';
}
