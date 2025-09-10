import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

interface NameSuggestion {
  contactId: string;
  phone: string;
  currentName?: string;
  suggestedName: string;
  messageBody: string;
  confidence: number;
}

export const useNameSuggestions = () => {
  return useQuery({
    queryKey: ['name-suggestions'],
    queryFn: async (): Promise<NameSuggestion[]> => {
      // Get contacts without names or with very generic names
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, phone, name')
        .or('name.is.null,name.eq.' + '');

      if (contactsError) throw contactsError;

      const suggestions: NameSuggestion[] = [];

      // For each contact, check recent messages for name patterns
      for (const contact of contacts) {
        const { data: messages, error: messagesError } = await supabase
          .from('messages')
          .select('body, created_at')
          .eq('wa_from', contact.phone)
          .eq('direction', 'inbound')
          .order('created_at', { ascending: false })
          .limit(10);

        if (messagesError) continue;

        // Check each message for name patterns
        for (const message of messages) {
          const suggestedName = extractNameFromMessage(message.body);
          if (suggestedName && suggestedName !== contact.name) {
            suggestions.push({
              contactId: contact.id,
              phone: contact.phone,
              currentName: contact.name,
              suggestedName,
              messageBody: message.body,
              confidence: calculateConfidence(message.body, suggestedName)
            });
            break; // Only one suggestion per contact
          }
        }
      }

      // Sort by confidence
      return suggestions.sort((a, b) => b.confidence - a.confidence);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

function extractNameFromMessage(messageBody: string): string | null {
  if (!messageBody) return null;
  
  const text = messageBody.toLowerCase().trim();
  
  // Same patterns as in the webhook
  const namePatterns = [
    /(?:^|[.\s])(?:oi|olá|ola|e ai|eai|hey|hello)[,\s]*(?:sou|eu sou|me chamo|meu nome é|é o|é a|aqui é o|aqui é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:sou o|sou a|sou)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:me chamo|meu nome é)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:aqui é o|aqui é a|aqui quem fala é o|aqui quem fala é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:[.\s]|$)/i,
    /(?:^|[.\s])(?:é o|é a)\s+([a-záàâãéêíóôõúç\s]{2,30}?)(?:\s+(?:falando|aqui|mesmo))?(?:[.\s]|$)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const extractedName = match[1].trim();
      // Validate the extracted name
      if (extractedName.length >= 2 && extractedName.length <= 30 && 
          !extractedName.match(/^\d+$/) &&
          !extractedName.includes('whatsapp') &&
          !extractedName.includes('número')) {
        // Capitalize properly
        return extractedName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    }
  }
  
  return null;
}

function calculateConfidence(messageBody: string, suggestedName: string): number {
  let confidence = 0.5; // Base confidence
  
  const text = messageBody.toLowerCase();
  
  // Higher confidence for explicit introductions
  if (text.includes('me chamo') || text.includes('meu nome é')) {
    confidence += 0.3;
  }
  
  if (text.includes('sou o') || text.includes('sou a')) {
    confidence += 0.2;
  }
  
  // Lower confidence for shorter names
  if (suggestedName.length < 4) {
    confidence -= 0.2;
  }
  
  // Higher confidence for longer, more complete names
  if (suggestedName.includes(' ')) {
    confidence += 0.1;
  }
  
  return Math.min(1, Math.max(0, confidence));
}