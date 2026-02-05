// ========== PROPERTY SEARCH, FORMAT & C2S INTEGRATION ==========
// Extracted from make-webhook/index.ts for modularity

import { 
  FallbackSearchResult, 
  PropertyHighlights, 
  PropertyResult 
} from './types.ts';
import { formatCurrency } from './utils.ts';
import { normalizeNeighborhood, expandRegionToNeighborhoods } from './regions.ts';

// ========== PROPERTY SEARCH ==========

export async function searchProperties(
  supabase: any, 
  params: Record<string, any>
): Promise<any> {
  try {
    let normalizedParams = { ...params };
    
    if (params.bairro) {
      const expansion = expandRegionToNeighborhoods(params.bairro);
      
      if (expansion.isRegion) {
        console.log(`📍 Region detected: ${params.bairro} → ${expansion.regionName}`);
        normalizedParams.bairro = expansion.neighborhoods[0];
      } else {
        const normalized = normalizeNeighborhood(params.bairro);
        if (normalized.confidence < 1.0 && normalized.confidence >= 0.6) {
          console.log(`📍 Normalized "${params.bairro}" → "${normalized.normalized}"`);
        }
        normalizedParams.bairro = normalized.normalized;
      }
    }
    
    console.log('🏠 Searching properties:', normalizedParams);
    
    const { data, error } = await supabase.functions.invoke('vista-search-properties', {
      body: normalizedParams
    });

    if (error) {
      console.error('❌ Vista search error:', error);
      return { success: false, properties: [], error: error.message };
    }

    console.log(`✅ Vista returned ${data?.properties?.length || 0} properties`);
    return data;
  } catch (e) {
    console.error('❌ Error calling Vista:', e);
    return { success: false, properties: [], error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ========== FALLBACK SEARCH (PROGRESSIVE WIDENING) ==========

export async function searchPropertiesWithFallback(
  supabase: any, 
  params: Record<string, any>
): Promise<FallbackSearchResult> {
  const originalParams = { ...params };
  let usedParams = { ...params };
  const relaxedFields: string[] = [];
  
  // ===== LEVEL 1: EXACT SEARCH =====
  console.log('🔍 Fallback Level 1: Exact search');
  const exactResult = await searchProperties(supabase, params);
  
  if (exactResult.success && exactResult.properties?.length > 0) {
    return {
      success: true,
      properties: exactResult.properties,
      searchType: 'exact',
      originalParams,
      usedParams,
      relaxedFields
    };
  }
  
  // ===== LEVEL 2: RELAX BEDROOMS =====
  if (params.quartos) {
    console.log('🔍 Fallback Level 2: Removing bedroom filter');
    const { quartos, ...paramsWithoutBedrooms } = params;
    usedParams = { ...paramsWithoutBedrooms };
    relaxedFields.push('quartos');
    
    const noBedroomsResult = await searchProperties(supabase, paramsWithoutBedrooms);
    
    if (noBedroomsResult.success && noBedroomsResult.properties?.length > 0) {
      return {
        success: true,
        properties: noBedroomsResult.properties,
        searchType: 'sem_quartos',
        originalParams,
        usedParams,
        relaxedFields
      };
    }
  }
  
  // ===== LEVEL 3: RELAX NEIGHBORHOOD =====
  if (params.bairro) {
    console.log('🔍 Fallback Level 3: Removing neighborhood filter');
    const { bairro, quartos, ...paramsWithoutLocation } = params;
    usedParams = { ...paramsWithoutLocation };
    relaxedFields.push('bairro');
    if (params.quartos && !relaxedFields.includes('quartos')) {
      relaxedFields.push('quartos');
    }
    
    const noLocationResult = await searchProperties(supabase, paramsWithoutLocation);
    
    if (noLocationResult.success && noLocationResult.properties?.length > 0) {
      return {
        success: true,
        properties: noLocationResult.properties,
        searchType: 'sem_bairro',
        originalParams,
        usedParams,
        relaxedFields
      };
    }
  }
  
  // ===== NO RESULTS =====
  return {
    success: false,
    properties: [],
    searchType: 'no_results',
    originalParams,
    usedParams,
    relaxedFields
  };
}

// ========== CONTEXTUAL FALLBACK MESSAGE ==========

export function buildFallbackMessage(
  searchType: FallbackSearchResult['searchType'], 
  originalParams: Record<string, any>,
  properties: any[],
  contactName?: string
): string {
  const nameGreet = contactName ? `, ${contactName}` : '';
  
  if (searchType === 'exact') {
    return `Encontrei algumas opções que combinam com o que você busca${nameGreet}! 🏠 Olha essa primeira:`;
  }
  
  if (searchType === 'sem_quartos') {
    const originalBedrooms = originalParams.quartos;
    return `${nameGreet ? `${contactName}, ` : ''}Não encontrei opções com exatamente ${originalBedrooms} quartos nessa região 😊 Mas olha essa opção interessante:`;
  }
  
  if (searchType === 'sem_bairro') {
    const originalBairro = originalParams.bairro;
    return `${nameGreet ? `${contactName}, ` : ''}A região ${originalBairro} está com poucas opções no momento 🤔 Mas encontrei algo que pode te interessar em outra localização:`;
  }
  
  return `Encontrei algumas opções${nameGreet}! 🏠 Olha essa:`;
}

// ========== PROPERTY HIGHLIGHTS EXTRACTION ==========

export function extractPropertyHighlights(description: string | null | undefined): PropertyHighlights {
  const highlights: PropertyHighlights = {
    amenities: [],
    location: [],
    condition: [],
    differential: [],
    summary: ''
  };
  
  if (!description) return highlights;
  
  const text = description.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // ===== AMENITIES =====
  const amenityPatterns: [RegExp, string][] = [
    [/piscina(?:\s+aquecida)?/i, '🏊 piscina'],
    [/churrasqueir[ao]/i, '🍖 churrasqueira'],
    [/sacada\s*(?:com\s*)?(?:churrasqueira|gourmet)/i, '🏠 sacada gourmet'],
    [/sacada/i, '🏠 sacada'],
    [/academia|fitness|gym/i, '💪 academia'],
    [/playground|parquinho|brinquedoteca/i, '🎠 playground'],
    [/salao\s*(?:de\s*)?(?:festas|eventos)/i, '🎉 salão de festas'],
    [/portaria\s*24|24\s*horas?|vigilancia/i, '🔐 portaria 24h'],
    [/2\s*vagas?|duas\s*vagas?/i, '🚗 2 vagas'],
    [/3\s*vagas?|tres\s*vagas?/i, '🚗 3 vagas'],
    [/suite|suíte/i, '🛏️ suíte'],
    [/lavabo/i, '🚽 lavabo'],
    [/despensa/i, '📦 despensa'],
    [/area\s*(?:de\s*)?servico/i, '🧺 área de serviço'],
    [/varanda\s*gourmet/i, '🍽️ varanda gourmet'],
    [/espaco\s*gourmet/i, '🍽️ espaço gourmet'],
    [/closet/i, '👔 closet'],
    [/ar[\s-]?condicionado|split/i, '❄️ ar-condicionado'],
    [/aquecimento\s*(?:a\s*)?gas/i, '🔥 aquecimento a gás'],
    [/jardim\s*privativo/i, '🌿 jardim privativo'],
  ];
  
  for (const [pattern, label] of amenityPatterns) {
    if (pattern.test(text)) {
      highlights.amenities.push(label);
    }
  }
  
  // ===== LOCATION ADVANTAGES =====
  const locationPatterns: [RegExp, string][] = [
    [/pe\s*na\s*areia|frente\s*(pro\s*)?mar|beira\s*mar/i, '🏖️ pé na areia/frente mar'],
    [/vista\s*(pro\s*)?mar|vista\s*mar/i, '🌊 vista para o mar'],
    [/proximo\s*(?:ao?\s*)?(?:praia|lagoa)/i, '📍 próximo à praia/lagoa'],
    [/centro|localizacao\s*privilegiada|bem\s*localizado/i, '📍 localização privilegiada'],
    [/silencioso|tranquilo|residencial/i, '🤫 região tranquila'],
    [/comercio|mercado|padaria|farmacia/i, '🛒 próximo ao comércio'],
    [/escola|colegio|universidade/i, '🎓 próximo a escolas'],
    [/transporte|onibus|terminal/i, '🚌 fácil acesso transporte'],
    [/seguranca|portaria\s*24|vigilancia/i, '🔐 segurança 24h'],
  ];
  
  for (const [pattern, label] of locationPatterns) {
    if (pattern.test(text)) {
      highlights.location.push(label);
    }
  }
  
  // ===== CONDITION =====
  const conditionPatterns: [RegExp, string][] = [
    [/novo|recem\s*(?:construido|entregue)|nunca\s*habitado/i, '✨ imóvel novo'],
    [/reformado|reforma\s*recente|renovado/i, '🔧 reformado recentemente'],
    [/mobiliado|semi[\s-]?mobiliado/i, '🛋️ mobiliado'],
    [/pronto\s*para\s*morar/i, '🏠 pronto para morar'],
    [/excelente\s*estado|otimo\s*estado|bem\s*conservado/i, '👍 excelente estado'],
    [/sol\s*da\s*manha|nascente/i, '☀️ sol da manhã'],
    [/ventilado|arejado/i, '🌬️ bem ventilado'],
    [/luminoso|iluminado|claro/i, '💡 muito iluminado'],
  ];
  
  for (const [pattern, label] of conditionPatterns) {
    if (pattern.test(text)) {
      highlights.condition.push(label);
    }
  }
  
  // ===== DIFFERENTIALS =====
  const differentialPatterns: [RegExp, string][] = [
    [/exclusiv|unico|raro/i, '⭐ oportunidade exclusiva'],
    [/oportunidade|imperd[ií]vel|nao\s*perca/i, '🎯 oportunidade imperdível'],
    [/abaixo\s*(?:do\s*)?(?:mercado|valor)|desconto/i, '💰 abaixo do mercado'],
    [/aceita\s*(?:financiamento|carta|permuta)/i, '🏦 aceita financiamento/permuta'],
    [/documentacao\s*ok|escriturado/i, '📋 documentação em dia'],
    [/entrega\s*imediata|disponivel\s*imediato/i, '🚀 entrega imediata'],
    [/alto\s*padrao|luxo|premium/i, '👑 alto padrão'],
  ];
  
  for (const [pattern, label] of differentialPatterns) {
    if (pattern.test(text)) {
      highlights.differential.push(label);
    }
  }
  
  return highlights;
}

// ========== CONSULTATIVE SUMMARY ==========

export function generateConsultativeSummary(property: any, highlights: PropertyHighlights): string {
  const allHighlights = [
    ...highlights.differential.slice(0, 1),
    ...highlights.location.slice(0, 1),
    ...highlights.amenities.slice(0, 2),
    ...highlights.condition.slice(0, 1)
  ];
  
  if (allHighlights.length > 0) {
    const cleanHighlights = allHighlights.map(h => {
      return h.replace(/^[\u{1F300}-\u{1F9FF}]+\s*/gu, '');
    });
    
    if (cleanHighlights.length === 1) {
      return `✨ Destaque: ${cleanHighlights[0]}`;
    } else {
      return `✨ Destaques: ${cleanHighlights.slice(0, 3).join(', ')}`;
    }
  }
  
  if (property.descricao && property.descricao.trim().length > 0) {
    const firstSentence = property.descricao.trim().split(/[.!?\n]/)[0].trim();
    if (firstSentence.length > 0 && firstSentence.length <= 100) {
      return `📝 ${firstSentence}`;
    } else if (firstSentence.length > 100) {
      return `📝 ${firstSentence.substring(0, 97)}...`;
    }
  }
  
  return '';
}

// ========== FORMAT PROPERTY MESSAGE ==========

export function formatPropertyMessage(property: any): string {
  const lines = [`🏠 *${property.tipo} em ${property.bairro}*`];
  
  if (property.quartos > 0) {
    const suiteText = property.suites > 0 ? ` (${property.suites} suíte${property.suites > 1 ? 's' : ''})` : '';
    lines.push(`• ${property.quartos} quarto${property.quartos > 1 ? 's' : ''}${suiteText}`);
  }
  if (property.vagas > 0) lines.push(`• ${property.vagas} vaga${property.vagas > 1 ? 's' : ''}`);
  if (property.area_util > 0) lines.push(`• ${property.area_util}m²`);
  lines.push(`• ${property.preco_formatado}`);
  if (property.valor_condominio > 0) {
    lines.push(`• Condomínio: ${formatCurrency(property.valor_condominio)}`);
  }
  
  const highlights = extractPropertyHighlights(property.descricao);
  const summary = generateConsultativeSummary(property, highlights);
  
  if (summary) {
    lines.push('');
    lines.push(summary);
  }
  
  lines.push(`🔗 ${property.link}`);
  
  return lines.join('\n');
}

// ========== CONSULTATIVE QUESTION ==========

export function generateConsultativeQuestion(
  property: any, 
  highlights: PropertyHighlights, 
  clientName?: string
): string {
  const nameGreet = clientName ? `, ${clientName}` : '';
  
  if (highlights.amenities.length > 0) {
    const amenity = highlights.amenities[0].replace(/^[\u{1F300}-\u{1F9FF}]+\s*/gu, '');
    return `O que você acha${nameGreet}? A ${amenity} é importante pra você? 😊`;
  }
  
  if (highlights.location.length > 0) {
    const location = highlights.location[0].replace(/^[\u{1F300}-\u{1F9FF}]+\s*/gu, '');
    return `Essa ${location} faz diferença pra você${nameGreet}? 😊`;
  }
  
  if (highlights.condition.length > 0) {
    return `Esse imóvel faz sentido pra você${nameGreet}? 😊`;
  }
  
  return `Esse imóvel faz sentido pra você${nameGreet}? 😊`;
}

// ========== C2S INTEGRATION ==========

export async function sendLeadToC2S(
  supabase: any,
  params: Record<string, any>, 
  phoneNumber: string, 
  conversationHistory: string,
  contactName?: string
): Promise<{ success: boolean; c2s_lead_id?: string; error?: string }> {
  try {
    console.log('🏢 Sending lead to C2S:', params);
    
    const { data, error } = await supabase.functions.invoke('c2s-create-lead', {
      body: {
        name: params.nome || contactName || 'Lead WhatsApp',
        phone: phoneNumber,
        type_negotiation: params.finalidade === 'locacao' ? 'Locação' : 'Compra',
        property_type: params.tipo_imovel,
        neighborhood: params.bairro,
        price_range: params.faixa_preco,
        bedrooms: params.quartos,
        description: params.interesse || params.resumo,
        conversation_history: conversationHistory,
      }
    });

    if (error) {
      console.error('❌ C2S send error:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Lead sent to C2S');
    return { success: true, c2s_lead_id: data?.c2s_lead_id };
  } catch (e) {
    console.error('❌ Error calling C2S:', e);
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

// ========== PROPERTY CODE EXTRACTION ==========

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
