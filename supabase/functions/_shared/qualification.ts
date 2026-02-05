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
  
  // ===== DETECT PROPERTY TYPE =====
  const typePatterns = [
    { pattern: /\b(apartamento|apto|ap)\b/i, value: 'Apartamento' },
    { pattern: /\b(casa)\b/i, value: 'Casa' },
    { pattern: /\b(kitnet|kit|kitnete)\b/i, value: 'Kitnet' },
    { pattern: /\b(studio|est[úu]dio)\b/i, value: 'Studio' },
    { pattern: /\b(cobertura)\b/i, value: 'Cobertura' },
    { pattern: /\b(sobrado)\b/i, value: 'Sobrado' },
    { pattern: /\b(terreno|lote)\b/i, value: 'Terreno' },
    { pattern: /\b(comercial|loja|sala|ponto)\b/i, value: 'Comercial' }
  ];
  
  for (const { pattern, value } of typePatterns) {
    if (pattern.test(lower)) {
      data.detected_property_type = value;
      console.log(`🏠 Detected property type: "${value}"`);
      break;
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

// ========== UPDATE QUALIFICATION DATA ==========

export async function updateQualificationData(
  supabase: any, 
  phoneNumber: string, 
  newData: ExtractedQualificationData,
  forceUpdate: boolean = false
): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('lead_qualification')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    if (existing) {
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      
      if (newData.detected_neighborhood && (forceUpdate || !existing.detected_neighborhood)) {
        updates.detected_neighborhood = newData.detected_neighborhood;
      }
      if (newData.detected_property_type && (forceUpdate || !existing.detected_property_type)) {
        updates.detected_property_type = newData.detected_property_type;
      }
      if (newData.detected_bedrooms && (forceUpdate || !existing.detected_bedrooms)) {
        updates.detected_bedrooms = newData.detected_bedrooms;
      }
      if (newData.detected_budget_max && (forceUpdate || !existing.detected_budget_max)) {
        updates.detected_budget_max = newData.detected_budget_max;
      }
      if (newData.detected_interest && (forceUpdate || !existing.detected_interest)) {
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
  if (department === 'locacao') {
    return progress.has_region && progress.has_budget && (progress.has_type || progress.has_bedrooms);
  }
  
  if (department === 'vendas') {
    return progress.has_purpose && progress.has_region && progress.has_budget && (progress.has_type || progress.has_bedrooms);
  }
  
  return progress.has_region && (progress.has_type || progress.has_bedrooms);
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
  
  if (qualData.detected_bedrooms) {
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
    
    return {
      progress: {
        has_region: !!data?.detected_neighborhood,
        has_type: !!data?.detected_property_type,
        has_bedrooms: !!data?.detected_bedrooms,
        has_budget: !!data?.detected_budget_max,
        has_purpose: !!data?.detected_interest
      },
      data: data || null
    };
  } catch (error) {
    console.error('❌ Error getting qualification progress:', error);
    return {
      progress: { has_region: false, has_type: false, has_bedrooms: false, has_budget: false, has_purpose: false },
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
    if (!progress.has_type) return '🏠 Você busca apartamento, casa ou outro tipo?';
    if (!progress.has_bedrooms) return '🛏️ Quantos quartos você precisa?';
    if (!progress.has_budget) return '💰 Qual sua faixa de valor para o aluguel?';
    return null;
  }
  
  if (department === 'vendas') {
    if (!progress.has_purpose) return 'Você está buscando para *morar* ou para *investir*?';
    if (!progress.has_region) return '📍 Qual região de Florianópolis te interessa?';
    if (!progress.has_type) return '🏠 Que tipo de imóvel você busca?';
    if (!progress.has_bedrooms) return '🛏️ Quantos quartos são ideais pra você?';
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
