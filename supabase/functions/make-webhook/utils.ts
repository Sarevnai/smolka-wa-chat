// ========== UTILITY FUNCTIONS ==========

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getPhoneVariations(phoneNumber: string): string[] {
  const variations = [phoneNumber];
  
  if (phoneNumber.startsWith('55') && phoneNumber.length === 12) {
    variations.push(phoneNumber.slice(0, 4) + '9' + phoneNumber.slice(4));
  }
  if (phoneNumber.startsWith('55') && phoneNumber.length === 13) {
    variations.push(phoneNumber.slice(0, 4) + phoneNumber.slice(5));
  }
  
  return variations;
}

export function formatCurrency(value: number | null): string {
  if (!value) return 'Consultar';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

// ========== HUMANIZATION ==========

const emojiSets = {
  greeting: ['😊', '👋', '🙂', '☺️'],
  agreement: ['✅', '👍', '😊', '🙂'],
  thinking: ['🤔', '💭', '📋', ''],
  sorry: ['😔', '🙏', '', ''],
  help: ['💡', '📞', '🏠', ''],
  thanks: ['🙏', '😊', '✨', ''],
  farewell: ['👋', '😊', '🙂', ''],
};

export function getRandomEmoji(context: keyof typeof emojiSets, intensity: string): string {
  if (intensity === 'none') return '';
  const set = emojiSets[context];
  const maxIndex = intensity === 'low' ? 2 : set.length;
  const emoji = set[Math.floor(Math.random() * maxIndex)];
  return emoji ? ` ${emoji}` : '';
}

const humanPhrases = {
  thinking: ['Deixa eu verificar...', 'Um momento...', 'Vou conferir isso...'],
  agreement: ['Entendi!', 'Certo!', 'Perfeito!', 'Claro!'],
  transition: ['Olha só,', 'Então,', 'Bom,', 'Veja bem,'],
  empathy: ['Entendo sua situação.', 'Compreendo.', 'Faz sentido.'],
};

export function getRandomPhrase(type: keyof typeof humanPhrases): string {
  const phrases = humanPhrases[type];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ========== VALIDATION ==========

const FORBIDDEN_RESPONSE_PATTERNS = [
  /quintoandar/i,
  /vivareal/i,
  /zap\s*im[oó]veis/i,
  /olx/i,
  /imovelweb/i,
  /outras?\s*imobili[aá]rias?/i,
];

export function validateAIResponse(response: string): { valid: boolean; reason?: string } {
  if (!response) return { valid: true };
  
  for (const pattern of FORBIDDEN_RESPONSE_PATTERNS) {
    if (pattern.test(response)) {
      console.log(`🚫 Invalid AI response - matched pattern: ${pattern}`);
      return { valid: false, reason: `Contains forbidden content` };
    }
  }
  return { valid: true };
}

export const FALLBACK_RESPONSE = "Olá! Sou da Smolka Imóveis 🏠 Como posso ajudar você?";

// ========== PROPERTY LINK EXTRACTION ==========

export function extractPropertyCodeFromUrl(message: string): string | null {
  if (!message) return null;
  
  const smolkaUrlMatch = message.match(/smolkaimoveis\.com\.br\/imovel\/([^\s]+)/i);
  if (smolkaUrlMatch && smolkaUrlMatch[1]) {
    const urlPath = smolkaUrlMatch[1];
    const allNumbers = urlPath.match(/\d+/g);
    if (allNumbers && allNumbers.length > 0) {
      const lastNumber = allNumbers[allNumbers.length - 1];
      if (lastNumber.length >= 3 && lastNumber.length <= 6) {
        console.log(`🔗 Property code extracted from URL: ${lastNumber}`);
        return lastNumber;
      }
    }
  }
  
  const fallbackPatterns = [
    /codigo[=\/](\d{3,6})\b/i,
    /\/imovel\/(\d{3,6})(?:\s|$|\/|\?)/i
  ];
  
  for (const pattern of fallbackPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

export function containsPropertyUrl(message: string): boolean {
  return /smolkaimoveis\.com\.br\/imovel\//i.test(message) ||
         /vistasoft.*imovel/i.test(message);
}

// ========== C2S CONFIRMATION DETECTION ==========

export function detectConfirmation(message: string): 'yes' | 'correction' | 'no' | 'unclear' {
  const lower = message.toLowerCase().trim();
  
  const yesPatterns = [
    /^sim$/i, /^isso$/i, /^correto$/i, /^perfeito$/i, /^pode/i,
    /tudo certo/i, /está correto/i, /confirmo/i, /isso mesmo/i,
    /^ok$/i, /^beleza$/i, /^certo$/i, /^bora$/i, /^vamos$/i,
    /pode sim/i, /pode ser/i, /tá bom/i, /ta bom/i
  ];
  
  const noPatterns = [
    /^não$/i, /errado/i, /incorreto/i, /cancelar/i,
    /não quero/i, /mudei de ideia/i, /desistir/i
  ];
  
  if (yesPatterns.some(p => p.test(lower))) return 'yes';
  if (noPatterns.some(p => p.test(lower))) return 'no';
  
  // If message contains name, phone, or email - it's likely a correction/data provision
  if (/meu\s+(telefone|nome|email|celular)/i.test(lower)) return 'correction';
  if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+/.test(message)) return 'correction'; // Full name pattern
  if (/\d{10,13}/.test(message)) return 'correction'; // Phone number pattern
  
  return 'unclear';
}

// ========== PROPERTY FEEDBACK ANALYSIS ==========

export function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'more_options' | 'interested_but_more' | 'neutral' {
  const lower = message.toLowerCase().trim();
  
  // Pedido de mais opções
  const moreOptionsPatterns = [
    /mais\s+op[çc][oõ]es/i,
    /outr[ao]s?\s+op[çc][oõ]es/i,
    /tem\s+mais/i,
    /mostr[ae]\s+outr[oa]/i,
    /pr[oó]xim[oa]/i,
    /outro\s+im[oó]vel/i,
    /pode\s+me\s+mostrar\s+mais/i,
    /mais\s+um/i,
    /mais\s+algum/i,
    /quero\s+ver\s+outr[oa]/i,
    /pode\s+mostrar\s+outr[oa]/i,
    /envia\s+outr[oa]/i,
    /manda\s+outr[oa]/i,
    /t[eê]m\s+outr[oa]/i,
    /algum\s+outr[oa]/i,
    /ver\s+mais/i,
    /mais\s+esse[s]?\s+n[aã]o/i,
    /pass[ae]\s+pro\s+pr[oó]ximo/i,
    /pul[ae]\s+esse/i,
    /segue|seguinte/i,
    /avan[çc]ar/i,
    /me\s+mostra\s+mais/i,
  ];
  
  // Feedback positivo (interesse real confirmado)
  const positivePatterns = [
    /gostei\s+(?:muito\s+)?(?:desse|dele|dessa)/i,
    /interess(?:ei|ado|ada|ante)/i,
    /quero\s+visitar/i,
    /quero\s+conhecer/i,
    /marcar\s+visita/i,
    /agendar/i,
    /quero\s+esse/i,
    /é\s+esse/i,
    /perfeito/i,
    /[oó]timo/i,
    /excelente/i,
    /adorei/i,
    /amei/i,
    /fechado/i,
    /fechou/i,
    /curti\s+(?:muito\s+)?(?:esse|esse\s+aqui)/i,
    /pode\s+ser\s+esse/i,
    /vamos\s+(?:nesse|nessa|com\s+esse)/i,
    /quero\s+saber\s+mais\s+(?:sobre\s+)?esse/i,
    /lindo/i,
    /maravilh/i,
    // Confirmação simples de interesse
    /^sim$/i,
    /^sim[,.]?\s/i,
    /^faz$/i,
    /^faz\s+sentido/i,
    /^pode\s*sim/i,
    /^pode$/i,
    /^isso$/i,
    /^isso\s+mesmo/i,
    /^bora$/i,
    /^vamos$/i,
    /^beleza$/i,
    /^show$/i,
    /^top$/i,
    /faz\s+sentido\s+sim/i,
    /quero\s+(?:sim|agendar|visitar)/i,
    /gostaria\s+(?:de\s+)?(?:visitar|agendar|conhecer)/i,
  ];
  
  // Feedback negativo
  const negativePatterns = [
    /n[aã]o\s+gostei/i,
    /n[aã]o\s+curti/i,
    /n[aã]o\s+(?:me\s+)?interess/i,
    /muito\s+caro/i,
    /acima\s+do\s+(?:meu\s+)?or[çc]amento/i,
    /fora\s+do\s+(?:meu\s+)?or[çc]amento/i,
    /longe\s+demais/i,
    /(?:muito\s+)?pequen[oa]/i,
    /(?:muito\s+)?grande/i,
    /n[aã]o\s+serve/i,
    /n[aã]o\s+(?:é|e)\s+o\s+que\s+(?:eu\s+)?(?:procuro|quero)/i,
    /descart(?:o|ei|ado)/i,
    /horr[ií]vel/i,
    /p[eé]ssim[oa]/i,
    /ruim/i,
    /n[aã]o\s+quero/i,
  ];
  
  const hasMoreIntent = moreOptionsPatterns.some(p => p.test(lower));
  const hasPositiveIntent = positivePatterns.some(p => p.test(lower));
  const hasNegativeIntent = negativePatterns.some(p => p.test(lower));
  
  // Compound detection
  if (hasNegativeIntent && hasMoreIntent) {
    console.log('📊 Compound detected: negative + more → more_options');
    return 'more_options';
  }
  
  if (hasPositiveIntent && hasMoreIntent) {
    console.log('📊 Compound detected: positive + more → interested_but_more');
    return 'interested_but_more';
  }
  
  const butMorePattern = /(?:mas|por[eé]m|entretanto)\s*(?:,?\s*)(?:mostr|tem|quero|ver|envi|mand)/i;
  if (butMorePattern.test(lower)) {
    console.log('📊 Compound detected: but + action → more_options');
    return 'more_options';
  }
  
  if (hasMoreIntent) {
    console.log('📊 Detected feedback: more_options');
    return 'more_options';
  }
  
  if (hasPositiveIntent) {
    console.log('📊 Detected feedback: positive');
    return 'positive';
  }
  
  if (hasNegativeIntent) {
    console.log('📊 Detected feedback: negative');
    return 'negative';
  }
  
  console.log('📊 Detected feedback: neutral');
  return 'neutral';
}

// ========== PRICE FLEXIBILITY DETECTION ==========

export function detectPriceFlexibility(message: string): { type: 'increase' | 'decrease' | 'none'; hasNewValue: boolean; suggestedQuestion: string | null } {
  const lower = message.toLowerCase();
  
  const increaseNoValue = /pode ser mais caro|aceito pagar mais|flexivel|flexível|aumento|valor maior|preço maior|pago mais|posso pagar mais|aumentar o valor|subir o preço/i;
  const decreaseNoValue = /mais barato|menos|menor valor|mais em conta|orçamento menor|diminuir|reduzir|abaixar/i;
  const hasValue = /\d+\s*(mil|k|reais|R\$|\$)/i.test(message) || /\d{4,}/i.test(message);
  
  if (increaseNoValue.test(lower) && !hasValue) {
    return {
      type: 'increase',
      hasNewValue: false,
      suggestedQuestion: 'Até quanto você considera pagar? Assim consigo buscar opções melhores pra você 😊'
    };
  }
  
  if (decreaseNoValue.test(lower) && !hasValue) {
    return {
      type: 'decrease',
      hasNewValue: false,
      suggestedQuestion: 'Qual seria o valor máximo ideal pra você? 😊'
    };
  }
  
  return { type: 'none', hasNewValue: hasValue, suggestedQuestion: null };
}
