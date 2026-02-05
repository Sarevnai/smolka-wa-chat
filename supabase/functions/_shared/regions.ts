// ========== FLORIANÓPOLIS REGIONS ==========

interface RegionInfo {
  nome: string;
  bairros: string[];
}

export const FLORIANOPOLIS_REGIONS: Record<string, RegionInfo> = {
  norte: {
    nome: "Região Norte",
    bairros: ["Ingleses", "Ingleses do Rio Vermelho", "Santinho", "Canasvieiras", "Jurerê", "Jurerê Internacional", "Daniela", "Cachoeira do Bom Jesus", "Ponta das Canas", "Lagoinha", "Vargem Grande", "Vargem Pequena", "Vargem do Bom Jesus", "Ratones", "Santo Antônio de Lisboa", "Sambaqui", "Praia Brava", "Rio Vermelho", "São João do Rio Vermelho"]
  },
  sul: {
    nome: "Região Sul", 
    bairros: ["Campeche", "Rio Tavares", "Morro das Pedras", "Armação", "Armação do Pântano do Sul", "Pântano do Sul", "Ribeirão da Ilha", "Costa de Dentro", "Carianos", "Aeroporto", "Tapera", "Base Aérea", "Alto Ribeirão", "Caeira da Barra do Sul", "Costeira do Pirajubaé", "Saco dos Limões"]
  },
  leste: {
    nome: "Região Leste",
    bairros: ["Lagoa da Conceição", "Barra da Lagoa", "Costa da Lagoa", "Canto da Lagoa", "Praia Mole", "Joaquina", "Praia da Joaquina", "Retiro da Lagoa", "Canto dos Araçás", "Porto da Lagoa"]
  },
  centro: {
    nome: "Região Central",
    bairros: ["Centro", "Agronômica", "Trindade", "Córrego Grande", "Pantanal", "Santa Mônica", "Itacorubi", "João Paulo", "Monte Verde", "Saco Grande", "José Mendes", "Prainha", "Carvoeira", "Serrinha"]
  },
  continente: {
    nome: "Continente",
    bairros: ["Estreito", "Coqueiros", "Itaguaçu", "Abraão", "Capoeiras", "Bom Abrigo", "Balneário", "Coloninha", "Jardim Atlântico", "Monte Cristo", "Ponte do Imaruim", "Chico Mendes", "Vila Aparecida", "Sapé", "Bela Vista", "Kobrasol"]
  }
};

export function getAllNeighborhoods(): string[] {
  const all: string[] = [];
  for (const region of Object.values(FLORIANOPOLIS_REGIONS)) {
    all.push(...region.bairros);
  }
  return all;
}

export function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const len1 = s1.length, len2 = s2.length, maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;
  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) matrix[i] = [i];
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return 1 - matrix[len1][len2] / maxLen;
}

export function normalizeNeighborhood(input: string): { normalized: string; confidence: number; original: string } {
  const trimmed = input.trim();
  const allNeighborhoods = getAllNeighborhoods();
  const exactMatch = allNeighborhoods.find(n => n.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return { normalized: exactMatch, confidence: 1.0, original: trimmed };
  const partialMatch = allNeighborhoods.find(n => n.toLowerCase().startsWith(trimmed.toLowerCase()) || trimmed.toLowerCase().startsWith(n.toLowerCase()));
  if (partialMatch) return { normalized: partialMatch, confidence: 0.95, original: trimmed };
  let bestMatch = trimmed, bestScore = 0;
  for (const neighborhood of allNeighborhoods) {
    const similarity = stringSimilarity(trimmed, neighborhood);
    if (similarity > bestScore && similarity >= 0.6) { bestScore = similarity; bestMatch = neighborhood; }
  }
  return { normalized: bestMatch, confidence: bestScore, original: trimmed };
}

export function expandRegionToNeighborhoods(input: string): { isRegion: boolean; neighborhoods: string[]; regionName?: string; suggestion?: string; } {
  const normalized = input.toLowerCase().trim().replace(/^regi[aã]o\s+/, '');
  if (FLORIANOPOLIS_REGIONS[normalized]) {
    const region = FLORIANOPOLIS_REGIONS[normalized];
    return { isRegion: true, neighborhoods: region.bairros, regionName: region.nome, suggestion: `A ${region.nome} tem ótimas opções! Posso sugerir: ${region.bairros.slice(0, 4).join(', ')}...` };
  }
  const result = normalizeNeighborhood(input);
  if (result.confidence < 0.8 && result.confidence > 0.5) {
    return { isRegion: false, neighborhoods: [result.normalized], suggestion: `Você quis dizer ${result.normalized}?` };
  }
  return { isRegion: false, neighborhoods: [result.normalized] };
}

export function generateRegionKnowledge(): string {
  const lines: string[] = ['\n📍 CONHECIMENTO LOCAL DE FLORIANÓPOLIS:', ''];
  for (const [key, region] of Object.entries(FLORIANOPOLIS_REGIONS)) {
    lines.push(`${region.nome.toUpperCase()}: ${region.bairros.slice(0, 8).join(', ')}${region.bairros.length > 8 ? '...' : ''}`);
  }
  lines.push('', '⚡ REGIÕES:', '- "norte" → Ingleses, Canasvieiras, Jurerê...', '- "sul" → Campeche, Armação, Ribeirão...', '- "leste" ou "lagoa" → Lagoa da Conceição, Barra...', '- "centro" → Trindade, Agronômica, Itacorubi...', '- "continente" → Estreito, Coqueiros...', '', '⚡ CORREÇÃO DE ERROS: "Tridade" → "Trindade", "Ingleseis" → "Ingleses"');
  return lines.join('\n');
}
