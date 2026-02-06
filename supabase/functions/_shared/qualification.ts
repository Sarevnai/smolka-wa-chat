// ========== LEAD QUALIFICATION SYSTEM ==========
// Extracted from make-webhook/index.ts for modularity

import { 
  QualificationData, 
  QualificationProgress,
  ExtractedQualificationData,
  FlexibilizationResult 
} from './types.ts';
import { 
  normalizeNeighborhood, 
  getAllNeighborhoods, 
  FLORIANOPOLIS_REGIONS 
} from './regions.ts';

// ========== EXTRACT QUALIFICATION DATA FROM MESSAGE ==========

export function extractQualificationData(message: string): ExtractedQualificationData {
  const data: ExtractedQualificationData = {};
  const lower = message.toLowerCase();
  
  // ===== DETECT REGION/NEIGHBORHOOD =====
  const knownNeighborhoods = [
    'centro', 'beira mar', 'beira-mar', 'beiramar', 'ingleses', 'jurere', 'jurerê',
    'canasvieiras', 'lagoa', 'lagoa da conceição', 'itacorubi', 'trindade',
    'coqueiros', 'estreito', 'kobrasol', 'campinas', 'barreiros', 'pantanal',
    'santa monica', 'santa mônica', 'agronômica', 'agronomica', 'corrego grande',
    'córrego grande', 'cacupe', 'cacupé', 'saco grande', 'rio tavares', 'campeche',
    'armação', 'armacao', 'ribeirao', 'ribeirão', 'ribeirao da ilha', 'pântano do sul',
    'pantano do sul', 'barra da lagoa', 'daniela', 'santo antonio', 'santo antônio',
    'ratones', 'vargem grande', 'vargem pequena', 'cachoeira do bom jesus', 'santinho',
    'praia brava', 'ponta das canas', 'costeira', 'capoeiras', 'abraao', 'abraão',
    'coloninha', 'jardim atlantico', 'jardim atlântico', 'monte verde', 'joao paulo',
    'joão paulo', 'saco dos limoes', 'saco dos limões', 'carvoeira', 'serrinha',
    'tapera', 'carianos', 'costeira do pirajubae', 'costeira do pirajubaé'
  ];
  
  const regionPatterns = [
    { pattern: /\b(norte|regiao norte|região norte)\b/i, value: 'Norte (Ingleses, Canasvieiras)' },
    { pattern: /\b(sul|regiao sul|região sul)\b/i, value: 'Sul (Campeche, Armação)' },
    { pattern: /\b(leste|regiao leste|região leste)\b/i, value: 'Leste (Lagoa)' },
    { pattern: /\b(continente)\b/i, value: 'Continente (Estreito, Coqueiros)' }
  ];
  
  for (const { pattern, value } of regionPatterns) {
    if (pattern.test(lower)) {
      data.detected_neighborhood = value;
      console.log(`📍 Detected region: "${value}"`);
      break;
    }
  }
  
  if (!data.detected_neighborhood) {
    for (const neighborhood of knownNeighborhoods) {
      if (lower.includes(neighborhood)) {
        data.detected_neighborhood = neighborhood.charAt(0).toUpperCase() + neighborhood.slice(1);
        console.log(`📍 Detected neighborhood: "${data.detected_neighborhood}"`);
        break;
      }
    }
  }
  
  // ===== DETECT PROPERTY TYPE (with correction detection) =====
  // Priority 1: Commercial types (explicit mentions take precedence)
  const commercialPatterns = [
    { pattern: /\b(sala\s+comercial|ponto\s+comercial|loja|sala|comercial|escrit[oó]rio)\b/i, value: 'Comercial' }
  ];
  
  // Priority 2: Other property types
  const residentialPatterns = [
    { pattern: /\b(apartamento|apto|ap)\b/i, value: 'Apartamento' },
    { pattern: /\b(casa)\b/i, value: 'Casa' },
    { pattern: /\b(kitnet|kit|kitnete)\b/i, value: 'Kitnet' },
    { pattern: /\b(studio|est[úu]dio)\b/i, value: 'Studio' },
    { pattern: /\b(cobertura)\b/i, value: 'Cobertura' },
    { pattern: /\b(sobrado)\b/i, value: 'Sobrado' },
    { pattern: /\b(terreno|lote)\b/i, value: 'Terreno' }
  ];
  
  // Check for commercial first (higher priority)
  for (const { pattern, value } of commercialPatterns) {
    if (pattern.test(lower)) {
      data.detected_property_type = value;
      console.log(`🏠 Detected property type (commercial priority): "${value}"`);
      break;
    }
  }
  
  // Only check residential if no commercial detected
  if (!data.detected_property_type) {
    for (const { pattern, value } of residentialPatterns) {
      if (pattern.test(lower)) {
        data.detected_property_type = value;
        console.log(`🏠 Detected property type: "${value}"`);
        break;
      }
    }
  }
  
  // ===== DETECT BEDROOMS =====
  const bedroomPatterns = [
    /(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i,
    /(?:quero|preciso|busco|procuro)\s*(?:de\s*)?(\d+)\s*(?:quartos?|qtos?)/i,
    /(?:com|de)\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i
  ];
  
  for (const pattern of bedroomPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 10) {
        data.detected_bedrooms = num;
        console.log(`🛏️ Detected bedrooms: ${num}`);
        break;
      }
    }
  }
  
  // ===== DETECT BUDGET =====
  const budgetPatterns = [
    /(?:at[eé]|m[aá]ximo|limite)\s*(?:de\s*)?(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:mil|k|reais)?/i,
    /(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*)\s*(?:mil|k)?(?:\s*reais)?/i,
    /(\d+)\s*(?:mil|k)/i
  ];
  
  for (const pattern of budgetPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let rawValue = match[1];
      let value: number;
      
      if (rawValue.includes('.') && /\.\d{3}/.test(rawValue)) {
        value = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
      } else if (rawValue.includes(',')) {
        value = parseFloat(rawValue.replace(',', '.'));
      } else {
        value = parseFloat(rawValue);
      }
      
      if (/mil|k/i.test(message) && value < 1000) {
        value *= 1000;
      }
      
      if (value >= 500 && value <= 100000000) {
        data.detected_budget_max = value;
        console.log(`💰 Detected budget: R$ ${value}`);
        break;
      }
    }
  }
  
  // ===== DETECT INTEREST/PURPOSE =====
  const interestPatterns = [
    { pattern: /\b(morar|moradia|residir|moro|mudar)\b/i, value: 'morar' },
    { pattern: /\b(investir|investimento|aplicar|renda|alugar.*para.*terceiros)\b/i, value: 'investir' },
    { pattern: /\b(alugar|aluguel|loca[çc][aã]o|alugo)\b/i, value: 'alugar' },
    { pattern: /\b(comprar|adquirir|compra|venda)\b/i, value: 'comprar' }
  ];
  
  for (const { pattern, value } of interestPatterns) {
    if (pattern.test(lower)) {
      data.detected_interest = value;
      console.log(`🎯 Detected interest: "${value}"`);
      break;
    }
  }
  
  return data;
}

// ========== CORRECTION DETECTION ==========
// Detects when user explicitly corrects previous information

export interface CorrectionResult {
  detected: boolean;
  fieldsToUpdate: string[];
  corrections: ExtractedQualificationData;
}

export function detectCorrection(message: string, existingData: any): CorrectionResult {
  const lower = message.toLowerCase();
  const result: CorrectionResult = {
    detected: false,
    fieldsToUpdate: [],
    corrections: {}
  };
  
  // ===== PATTERN 1: Explicit negation of property type =====
  // "não busco casa", "não é casa", "não quero casa", "não procuro apartamento"
  const negationPatterns = [
    /n[aã]o\s+(?:busco|quero|procuro|é|eh|preciso\s+de)\s+(casa|apartamento|apto|kitnet|studio|cobertura|sobrado)/i,
    /(?:casa|apartamento|apto|kitnet|studio|cobertura|sobrado)\s+n[aã]o/i,
    /(?:nada\s+de|sem)\s+(casa|apartamento|apto|kitnet|studio|cobertura|sobrado)/i
  ];
  
  for (const pattern of negationPatterns) {
    if (pattern.test(lower)) {
      console.log(`🔄 Correction detected: user is negating a property type`);
      result.detected = true;
      result.fieldsToUpdate.push('detected_property_type');
      break;
    }
  }
  
  // ===== PATTERN 2: Explicit correction with "busco" + new type =====
  // "busco sala comercial", "procuro escritório", "quero loja"
  const correctionPhrases = [
    /(?:busco|procuro|quero|preciso\s+de?)\s+(?:uma?\s+)?(sala\s+comercial|sala|loja|ponto\s+comercial|comercial|escrit[oó]rio)/i,
    /(?:busco|procuro|quero|preciso\s+de?)\s+(?:uma?\s+)?(apartamento|apto|casa|kitnet|studio|cobertura|sobrado|terreno)/i
  ];
  
  const typeMap: Record<string, string> = {
    'sala comercial': 'Comercial',
    'sala': 'Comercial',
    'loja': 'Comercial',
    'ponto comercial': 'Comercial',
    'comercial': 'Comercial',
    'escritório': 'Comercial',
    'escritorio': 'Comercial',
    'apartamento': 'Apartamento',
    'apto': 'Apartamento',
    'casa': 'Casa',
    'kitnet': 'Kitnet',
    'studio': 'Studio',
    'cobertura': 'Cobertura',
    'sobrado': 'Sobrado',
    'terreno': 'Terreno'
  };
  
  for (const pattern of correctionPhrases) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const newType = typeMap[match[1].toLowerCase()];
      if (newType && existingData?.detected_property_type && existingData.detected_property_type !== newType) {
        console.log(`🔄 Correction detected: changing property type from "${existingData.detected_property_type}" to "${newType}"`);
        result.detected = true;
        result.fieldsToUpdate.push('detected_property_type');
        result.corrections.detected_property_type = newType;
      } else if (newType && !existingData?.detected_property_type) {
        // Not a correction, but new data - still capture it
        result.corrections.detected_property_type = newType;
      }
      break;
    }
  }
  
  // ===== PATTERN 3: "na verdade", "corrijo", "errei" patterns =====
  const explicitCorrectionPatterns = [
    /(?:na\s+verdade|corrig(?:indo|o)|errei|me\s+enganei|desculpa|desculpe)/i
  ];
  
  for (const pattern of explicitCorrectionPatterns) {
    if (pattern.test(lower)) {
      console.log(`🔄 Explicit correction phrase detected`);
      result.detected = true;
      // When user explicitly corrects, we should re-extract and force update
      break;
    }
  }
  
  // ===== PATTERN 4: Budget correction =====
  // "até X" when budget already exists suggests correction
  const budgetCorrectionMatch = message.match(/(?:até|ate|máximo|maximo|no\s+máximo)\s*(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*)/i);
  if (budgetCorrectionMatch && existingData?.detected_budget_max) {
    let rawValue = budgetCorrectionMatch[1];
    let value = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
    if (/mil|k/i.test(message) && value < 1000) value *= 1000;
    
    if (value !== existingData.detected_budget_max && value >= 500) {
      console.log(`🔄 Budget correction detected: from R$ ${existingData.detected_budget_max} to R$ ${value}`);
      result.detected = true;
      result.fieldsToUpdate.push('detected_budget_max');
      result.corrections.detected_budget_max = value;
    }
  }
  
  // ===== PATTERN 5: Bedroom correction =====
  const bedroomCorrectionMatch = message.match(/(?:na\s+verdade|preciso\s+de|quero|busco)\s*(\d+)\s*(?:quartos?|qtos?)/i);
  if (bedroomCorrectionMatch && existingData?.detected_bedrooms) {
    const newBedrooms = parseInt(bedroomCorrectionMatch[1]);
    if (newBedrooms !== existingData.detected_bedrooms && newBedrooms >= 1 && newBedrooms <= 10) {
      console.log(`🔄 Bedrooms correction detected: from ${existingData.detected_bedrooms} to ${newBedrooms}`);
      result.detected = true;
      result.fieldsToUpdate.push('detected_bedrooms');
      result.corrections.detected_bedrooms = newBedrooms;
    }
  }
  
  return result;
}

// ========== UPDATE QUALIFICATION DATA ==========

export async function updateQualificationData(
  supabase: any, 
  phoneNumber: string, 
  newData: ExtractedQualificationData,
  forceUpdate: boolean = false,
  originalMessage?: string
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('lead_qualification')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    if (existing) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      
      // Check for corrections if we have the original message
      let correctionResult: CorrectionResult | null = null;
      if (originalMessage) {
        correctionResult = detectCorrection(originalMessage, existing);
        if (correctionResult.detected) {
          console.log(`🔄 Correction detected, fields to force update: ${correctionResult.fieldsToUpdate.join(', ')}`);
        }
      }
      
      // Helper to check if field should be updated
      const shouldUpdate = (field: string, newValue: any, existingValue: any): boolean => {
        if (!newValue) return false;
        if (forceUpdate) return true;
        if (!existingValue) return true;
        if (correctionResult?.fieldsToUpdate.includes(field)) return true;
        if (correctionResult?.corrections[field as keyof ExtractedQualificationData]) return true;
        return false;
      };
      
      // Apply corrections first
      if (correctionResult?.corrections.detected_property_type) {
        updates.detected_property_type = correctionResult.corrections.detected_property_type;
        // Clear bedrooms if switching to commercial (commercial doesn't have bedrooms)
        if (correctionResult.corrections.detected_property_type === 'Comercial') {
          updates.detected_bedrooms = null;
          console.log(`🔄 Clearing bedrooms since property is now Commercial`);
        }
      }
      if (correctionResult?.corrections.detected_budget_max) {
        updates.detected_budget_max = correctionResult.corrections.detected_budget_max;
      }
      if (correctionResult?.corrections.detected_bedrooms) {
        updates.detected_bedrooms = correctionResult.corrections.detected_bedrooms;
      }
      
      // Then apply new data with the shouldUpdate logic
      if (shouldUpdate('detected_neighborhood', newData.detected_neighborhood, existing.detected_neighborhood)) {
        updates.detected_neighborhood = newData.detected_neighborhood;
      }
      if (shouldUpdate('detected_property_type', newData.detected_property_type, existing.detected_property_type) && 
          !updates.detected_property_type) {
        updates.detected_property_type = newData.detected_property_type;
      }
      if (shouldUpdate('detected_bedrooms', newData.detected_bedrooms, existing.detected_bedrooms) && 
          !updates.hasOwnProperty('detected_bedrooms')) {
        updates.detected_bedrooms = newData.detected_bedrooms;
      }
      if (shouldUpdate('detected_budget_max', newData.detected_budget_max, existing.detected_budget_max) &&
          !updates.detected_budget_max) {
        updates.detected_budget_max = newData.detected_budget_max;
      }
      if (shouldUpdate('detected_interest', newData.detected_interest, existing.detected_interest)) {
        updates.detected_interest = newData.detected_interest;
      }
      
      if (Object.keys(updates).length > 1) {
        await supabase
          .from('lead_qualification')
          .update(updates)
          .eq('id', existing.id);
        console.log(`📊 Updated qualification data:`, updates);
      }
    } else {
      await supabase
        .from('lead_qualification')
        .insert({
          phone_number: phoneNumber,
          ...newData,
          started_at: new Date().toISOString()
        });
      console.log(`📊 Created new qualification record`);
    }
  } catch (error) {
    console.error('❌ Error updating qualification data:', error);
  }
}

// ========== MINIMUM CRITERIA CHECK ==========

export function hasMinimumCriteriaToSearch(
  department: string | null, 
  progress: QualificationProgress
): boolean {
  // Commercial properties don't need bedrooms - type alone is sufficient
  const hasPropertyInfo = progress.is_commercial ? progress.has_type : (progress.has_type || progress.has_bedrooms);
  
  if (department === 'locacao') {
    return progress.has_region && progress.has_budget && hasPropertyInfo;
  }
  
  if (department === 'vendas') {
    return progress.has_purpose && progress.has_region && progress.has_budget && hasPropertyInfo;
  }
  
  return progress.has_region && hasPropertyInfo;
}

// ========== BUILD SEARCH PARAMS ==========

export function buildSearchParamsFromQualification(
  department: string | null, 
  qualData: QualificationData | null
): Record<string, any> | null {
  if (!qualData) return null;
  
  const params: Record<string, any> = {
    finalidade: department === 'vendas' ? 'venda' : 'locacao',
    cidade: 'Florianópolis'
  };
  
  if (qualData.detected_neighborhood) {
    const regionMap: Record<string, string> = {
      'Norte (Ingleses, Canasvieiras)': 'Ingleses',
      'Sul (Campeche, Armação)': 'Campeche',
      'Leste (Lagoa)': 'Lagoa da Conceição',
      'Continente (Estreito, Coqueiros)': 'Estreito'
    };
    params.bairro = regionMap[qualData.detected_neighborhood] || qualData.detected_neighborhood;
  }
  
  if (qualData.detected_property_type) {
    const typeMap: Record<string, string> = {
      'Apartamento': 'apartamento',
      'Casa': 'casa',
      'Kitnet': 'kitnet',
      'Studio': 'kitnet',
      'Cobertura': 'cobertura',
      'Comercial': 'comercial',
      'Terreno': 'terreno',
      'Sobrado': 'sobrado'
    };
    params.tipo = typeMap[qualData.detected_property_type] || qualData.detected_property_type.toLowerCase();
  }
  
  // Only include bedrooms for non-commercial property types
  if (qualData.detected_bedrooms && qualData.detected_property_type !== 'Comercial') {
    params.quartos = qualData.detected_bedrooms;
  }
  
  if (qualData.detected_budget_max) {
    params.preco_max = qualData.detected_budget_max;
  }
  
  return params;
}

// ========== GET QUALIFICATION PROGRESS ==========

export async function getQualificationProgress(
  supabase: any, 
  phoneNumber: string
): Promise<{ progress: QualificationProgress; data: QualificationData | null }> {
  try {
    const { data } = await supabase
      .from('lead_qualification')
      .select('detected_neighborhood, detected_property_type, detected_bedrooms, detected_budget_max, detected_interest')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    const isCommercial = data?.detected_property_type === 'Comercial';
    
    return {
      progress: {
        has_region: !!data?.detected_neighborhood,
        has_type: !!data?.detected_property_type,
        has_bedrooms: isCommercial ? true : !!data?.detected_bedrooms, // Commercial skips bedrooms
        has_budget: !!data?.detected_budget_max,
        has_purpose: !!data?.detected_interest,
        is_commercial: isCommercial
      },
      data: data || null
    };
  } catch (error) {
    console.error('❌ Error getting qualification progress:', error);
    return {
      progress: { has_region: false, has_type: false, has_bedrooms: false, has_budget: false, has_purpose: false, is_commercial: false },
      data: null
    };
  }
}

// ========== GET NEXT QUESTION ==========

export function getNextQualificationQuestion(
  progress: QualificationProgress, 
  department: string
): string | null {
  if (department === 'locacao') {
    if (!progress.has_region) return '📍 Qual região de Florianópolis você prefere?';
    if (!progress.has_type) return '🏠 Você busca apartamento, casa, sala comercial ou outro tipo?';
    // Skip bedrooms for commercial properties - they don't have bedrooms
    if (!progress.has_bedrooms && !progress.is_commercial) return '🛏️ Quantos quartos você precisa?';
    if (!progress.has_budget) return '💰 Qual sua faixa de valor para o aluguel?';
    return null;
  }
  
  if (department === 'vendas') {
    if (!progress.has_purpose) return 'Você está buscando para *morar* ou para *investir*?';
    if (!progress.has_region) return '📍 Qual região de Florianópolis te interessa?';
    if (!progress.has_type) return '🏠 Que tipo de imóvel você busca?';
    // Skip bedrooms for commercial properties
    if (!progress.has_bedrooms && !progress.is_commercial) return '🛏️ Quantos quartos são ideais pra você?';
    if (!progress.has_budget) return '💰 Qual faixa de investimento você considera?';
    return null;
  }
  
  return null;
}

// ========== ANTI-LOOP: CHECK FOR LOOPING QUESTIONS ==========

export function isLoopingQuestion(
  aiResponse: string, 
  qualificationData: QualificationData | null
): boolean {
  if (!qualificationData) return false;
  
  const lower = aiResponse.toLowerCase();
  
  if (qualificationData.detected_neighborhood) {
    if (/qual\s+(regi[aã]o|bairro)|onde\s+voc[eê]|localiza[cç][aã]o|prefer[eê]ncia.*regi|que\s+regi/i.test(lower)) {
      console.log('⚠️ Loop detected: asking region again');
      return true;
    }
  }
  
  if (qualificationData.detected_bedrooms) {
    if (/quantos?\s+quartos?|n[uú]mero\s+de\s+(quartos?|dormit[oó]rios?)|quantos\s+dormit/i.test(lower)) {
      console.log('⚠️ Loop detected: asking bedrooms again');
      return true;
    }
  }
  
  if (qualificationData.detected_budget_max) {
    if (/faixa\s+de\s+(valor|pre[cç]o)|or[cç]amento|quanto\s+(quer|pode)\s+pagar|qual.*valor/i.test(lower)) {
      console.log('⚠️ Loop detected: asking budget again');
      return true;
    }
  }
  
  if (qualificationData.detected_property_type) {
    if (/que\s+tipo|qual\s+tipo|tipo\s+de\s+im[oó]vel|apartamento.*casa|busca\s+apartamento/i.test(lower)) {
      console.log('⚠️ Loop detected: asking property type again');
      return true;
    }
  }
  
  if (qualificationData.detected_interest) {
    if (/morar\s+ou\s+investir|para\s+morar|para\s+investir|objetivo|finalidade/i.test(lower)) {
      console.log('⚠️ Loop detected: asking purpose again');
      return true;
    }
  }
  
  return false;
}

// ========== FLEXIBILIZATION DETECTION ==========

export function detectFlexibilization(message: string): FlexibilizationResult {
  const lower = message.toLowerCase().trim();
  const updates: FlexibilizationResult['updates'] = {};
  const fields: string[] = [];
  
  // ===== PATTERN 1: Explicit bedroom flexibilization =====
  const quartosFlex = message.match(/(?:pode\s+ser|aceito|tá\s+bom|ta\s+bom|ok\s+com|pode\s+ter|até|ate)\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i);
  if (quartosFlex) {
    updates.detected_bedrooms = parseInt(quartosFlex[1]);
    fields.push('quartos');
    console.log(`📝 Flexibilization detected: bedrooms → ${updates.detected_bedrooms}`);
  }
  
  // ===== PATTERN 2: Budget with improved parsing =====
  const budgetPatterns = [
    /(?:pode\s+ser\s+)?(?:até|ate|máximo|maximo|no\s+máximo|no\s+maximo|limite\s+de?)\s*(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:mil|k|reais)?/i,
    /(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*)\s*(?:mil|k)?(?:\s*reais)?/i
  ];
  
  for (const pattern of budgetPatterns) {
    const budgetFlex = message.match(pattern);
    if (budgetFlex && !updates.detected_budget_max) {
      let rawValue = budgetFlex[1];
      let value: number;
      
      if (rawValue.includes('.') && /\.\d{3}/.test(rawValue)) {
        value = parseFloat(rawValue.replace(/\./g, '').replace(',', '.'));
      } else if (rawValue.includes(',')) {
        value = parseFloat(rawValue.replace(',', '.'));
      } else {
        value = parseFloat(rawValue);
      }
      
      if (/mil|k/i.test(message) && value < 1000) {
        value *= 1000;
      }
      
      if (value >= 500 && value <= 100000000) {
        updates.detected_budget_max = value;
        fields.push('orçamento');
        console.log(`📝 Flexibilization detected: budget → R$ ${updates.detected_budget_max}`);
        break;
      }
    }
  }
  
  // ===== PATTERN 3: Direct neighborhood/region answer =====
  if (!updates.detected_neighborhood && lower.length < 30) {
    const allNeighborhoods = getAllNeighborhoods();
    for (const neighborhood of allNeighborhoods) {
      if (lower === neighborhood.toLowerCase() || 
          lower.includes(neighborhood.toLowerCase()) ||
          neighborhood.toLowerCase().includes(lower)) {
        const normalized = normalizeNeighborhood(lower);
        if (normalized.confidence >= 0.7) {
          updates.detected_neighborhood = normalized.normalized;
          fields.push('bairro');
          console.log(`📝 Direct neighborhood answer detected: ${updates.detected_neighborhood}`);
          break;
        }
      }
    }
    
    for (const regionKey of Object.keys(FLORIANOPOLIS_REGIONS)) {
      if (lower === regionKey || lower.includes(regionKey)) {
        const region = FLORIANOPOLIS_REGIONS[regionKey];
        updates.detected_neighborhood = region.bairros[0];
        fields.push('bairro');
        console.log(`📝 Direct region answer detected: ${regionKey} → ${updates.detected_neighborhood}`);
        break;
      }
    }
  }
  
  // ===== PATTERN 4: "pode ser no Ribeirão" =====
  if (!updates.detected_neighborhood) {
    const regionFlex = message.match(/(?:pode\s+ser\s+)?(?:no|em|na|região|regiao)\s+([a-záàâãéèêíïóôõöúç\s]+?)(?:\s*[,.]|$)/i);
    if (regionFlex && regionFlex[1].length > 2 && regionFlex[1].length < 30) {
      const neighborhood = regionFlex[1].trim();
      const allNeighborhoods = getAllNeighborhoods();
      const isValidNeighborhood = allNeighborhoods.some(n => 
        n.toLowerCase().includes(neighborhood.toLowerCase()) ||
        neighborhood.toLowerCase().includes(n.toLowerCase())
      ) || Object.keys(FLORIANOPOLIS_REGIONS).includes(neighborhood.toLowerCase());
      
      if (isValidNeighborhood) {
        const normalized = normalizeNeighborhood(neighborhood);
        updates.detected_neighborhood = normalized.normalized;
        fields.push('bairro');
        console.log(`📝 Flexibilization detected: neighborhood → ${updates.detected_neighborhood}`);
      }
    }
  }
  
  // ===== PATTERN 5: Property type =====
  const typeFlex = message.match(/(?:pode\s+ser\s+)?(?:um|uma)?\s*(apartamento|apto|casa|kitnet|kit|studio|estúdio|estudio|cobertura|sobrado|terreno|comercial|loja|sala)/i);
  if (typeFlex) {
    const typeMap: Record<string, string> = {
      'apartamento': 'Apartamento',
      'apto': 'Apartamento',
      'casa': 'Casa',
      'kitnet': 'Kitnet',
      'kit': 'Kitnet',
      'studio': 'Studio',
      'estúdio': 'Studio',
      'estudio': 'Studio',
      'cobertura': 'Cobertura',
      'sobrado': 'Sobrado',
      'terreno': 'Terreno',
      'comercial': 'Comercial',
      'loja': 'Comercial',
      'sala': 'Comercial'
    };
    updates.detected_property_type = typeMap[typeFlex[1].toLowerCase()] || typeFlex[1];
    fields.push('tipo');
    console.log(`📝 Flexibilization detected: property type → ${updates.detected_property_type}`);
  }
  
  // ===== PATTERN 6: Bedrooms as simple number =====
  if (!updates.detected_bedrooms) {
    const simpleBedroomMatch = message.match(/^(\d)\s*(?:quartos?|qtos?)?$/i);
    if (simpleBedroomMatch) {
      const num = parseInt(simpleBedroomMatch[1]);
      if (num >= 1 && num <= 10) {
        updates.detected_bedrooms = num;
        fields.push('quartos');
        console.log(`📝 Simple bedroom answer detected: ${num}`);
      }
    }
  }
  
  // ===== PATTERN 7: Explicit bedroom requests =====
  if (!updates.detected_bedrooms) {
    const explicitBedroomPatterns = [
      /(?:quero|preciso|gostaria|prefiro|busco|procuro)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i,
      /(?:me\s+)?(?:mostra|manda|envia|veja)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?)/i,
      /(?:tenha|com)\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i,
      /(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)\s*(?:por favor|pf|pfv)?$/i,
      /(?:apartamento|apto|casa|imovel|imóvel)\s*(?:de|com)\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i
    ];
    
    for (const pattern of explicitBedroomPatterns) {
      const match = message.match(pattern);
      if (match) {
        const num = parseInt(match[1]);
        if (num >= 1 && num <= 10) {
          updates.detected_bedrooms = num;
          fields.push('quartos');
          console.log(`📝 Explicit bedroom request detected: ${num}`);
          break;
        }
      }
    }
  }
  
  return {
    detected: fields.length > 0,
    updates,
    fields
  };
}

// ========== WAITING SIGNAL DETECTION ==========

export function isWaitingSignal(message: string): boolean {
  const lower = message.toLowerCase().trim();
  
  const waitingPatterns = [
    /^(ok|okay|beleza|show|blz|certo|pode|perfeito|bom|ótimo|otimo)$/i,
    /fico\s+(?:no\s+)?aguardo/i,
    /aguardando/i,
    /pode\s+(?:buscar|procurar|mandar|enviar|pesquisar)/i,
    /vou\s+aguardar/i,
    /t[aá]\s+bom/i,
    /^sim$/i,
    /por\s+favor/i,
    /manda\s+a[ií]/i,
    /quero\s+ver/i,
    /mostra\s+(?:pra|para)\s+mim/i
  ];
  
  return waitingPatterns.some(pattern => pattern.test(lower));
}
