
# Plano de Refatoração: Dividir `make-webhook` em Módulos

## Problema Atual
O arquivo `supabase/functions/make-webhook/index.ts` tem **3.880 linhas** e está causando erro de timeout no deploy (`Bundle generation timed out`). Isso acontece porque o Supabase tem um limite de tempo para compilar funções edge muito grandes.

## Estratégia de Solução
Dividir o código em **7 módulos menores** na pasta `_shared`, mantendo apenas a lógica de orquestração principal no `index.ts`. Isso deve reduzir o arquivo principal para aproximadamente **800-1000 linhas**.

---

## Estrutura Proposta

```text
supabase/functions/
├── _shared/
│   ├── types.ts          (interfaces e tipos - ~200 linhas)
│   ├── regions.ts         (mapa de bairros de Florianópolis - ~150 linhas)
│   ├── utils.ts           (utilitários e validação - ~300 linhas)
│   ├── prompts.ts         (templates de prompts da IA - ~400 linhas)  [NOVO]
│   ├── property.ts        (busca, formatação e análise de imóveis - ~500 linhas) [NOVO]
│   ├── qualification.ts   (qualificação de leads - ~400 linhas) [NOVO]
│   └── audio.ts           (transcrição e TTS - ~150 linhas) [NOVO]
│
└── make-webhook/
    ├── index.ts           (orquestração principal - ~800 linhas)
    └── [remover arquivos locais duplicados: types.ts, regions.ts, utils.ts]
```

---

## Detalhamento dos Módulos

### 1. `_shared/types.ts` (já existe, expandir)
**Conteúdo:** Todas as interfaces e tipos usados entre funções.

```typescript
// Adicionar:
export interface MakeWebhookRequest { ... }
export interface MediaInfo { ... }
export interface AudioConfig { ... }
export interface AudioResult { ... }
export interface Development { ... }
export interface ConversationMessage { ... }
export interface AIAgentConfig { ... }
export interface AIBehaviorConfig { ... }
export interface QualificationData { ... }
export interface QualificationProgress { ... }
export interface ConsultativeState { ... }
export interface FallbackSearchResult { ... }
export interface PropertyHighlights { ... }
export type DepartmentType = 'locacao' | 'administrativo' | 'vendas' | 'marketing' | null;
export type TriageStage = 'greeting' | 'awaiting_name' | 'awaiting_triage' | 'completed' | null;
export const defaultConfig: AIAgentConfig = { ... };
```

**Linhas movidas:** ~1-200 do index.ts atual

---

### 2. `_shared/regions.ts` (já existe, consolidar)
**Conteúdo:** Mapeamento de regiões de Florianópolis.

```typescript
export const FLORIANOPOLIS_REGIONS: Record<string, RegionInfo> = { ... };
export function getAllNeighborhoods(): string[] { ... }
export function stringSimilarity(str1: string, str2: string): number { ... }
export function normalizeNeighborhood(input: string): { ... } { ... }
export function isRegionName(input: string): boolean { ... }
export function expandRegionToNeighborhoods(input: string): { ... } { ... }
export function generateRegionKnowledge(): string { ... }
```

**Linhas movidas:** ~197-374 do index.ts atual

---

### 3. `_shared/utils.ts` (já existe, expandir)
**Conteúdo:** Funções utilitárias, validação, humanização.

```typescript
export function normalizePhoneNumber(phone: string): string { ... }
export function getPhoneVariations(phoneNumber: string): string[] { ... }
export function formatCurrency(value: number | null): string { ... }
export function getRandomEmoji(context: string, intensity: string): string { ... }
export function getRandomPhrase(type: string): string { ... }
export function validateAIResponse(response: string): { valid: boolean; reason?: string } { ... }
export const FALLBACK_RESPONSE = "...";
export function extractPropertyCodeFromUrl(message: string): string | null { ... }
export function containsPropertyUrl(message: string): boolean { ... }
export function detectConfirmation(message: string): 'yes' | 'correction' | 'no' | 'unclear' { ... }
export function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'more_options' | 'interested_but_more' | 'neutral' { ... }
export function detectPriceFlexibility(message: string): PriceFlexibility { ... }
export function isSameMessage(msg1: string | null, msg2: string): boolean { ... }
export function isWaitingSignal(message: string): boolean { ... }
export function extractNameFromMessage(message: string): string | null { ... }
```

**Linhas movidas:** ~376-467, ~519-546, ~1406-1585, ~2189-2201, ~2470-2564

---

### 4. `_shared/prompts.ts` (NOVO)
**Conteúdo:** Todos os templates de prompts da IA.

```typescript
import { AIAgentConfig, ConversationMessage, QualificationData, Development } from './types.ts';
import { generateRegionKnowledge } from './regions.ts';
import { buildContextSummary } from './qualification.ts';

export function buildQuickTransferPrompt(dev: Development, contactName?: string, isFirstMessage?: boolean, history?: ConversationMessage[]): string { ... }
export function buildLocacaoPrompt(config: AIAgentConfig, contactName?: string, history?: ConversationMessage[], qualificationData?: QualificationData | null): string { ... }
export function buildVendasPrompt(config: AIAgentConfig, contactName?: string, history?: ConversationMessage[], qualificationData?: QualificationData | null): string { ... }
export function buildAdminPrompt(config: AIAgentConfig, contactName?: string): string { ... }
export function buildVirtualAgentPrompt(config: AIAgentConfig, contactName?: string): string { ... }
export function getPromptForDepartment(...): string { ... }
export const toolsWithVista = [ ... ];
export const toolsQuickTransfer = [ ... ];
```

**Linhas movidas:** ~548-920

---

### 5. `_shared/property.ts` (NOVO)
**Conteúdo:** Busca, formatação e análise de propriedades.

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatCurrency } from './utils.ts';
import { normalizeNeighborhood, expandRegionToNeighborhoods } from './regions.ts';
import { FallbackSearchResult, PropertyHighlights } from './types.ts';

export async function searchProperties(supabase: any, params: Record<string, any>): Promise<any> { ... }
export async function searchPropertiesWithFallback(supabase: any, params: Record<string, any>): Promise<FallbackSearchResult> { ... }
export function buildFallbackMessage(searchType: string, originalParams: Record<string, any>, properties: any[], contactName?: string): string { ... }
export function extractPropertyHighlightsQuick(description: string): { topFeature: string | null; consultiveHook: string } { ... }
export async function getPropertyByListingId(supabase: any, listingId: string): Promise<any | null> { ... }
export function extractPropertyHighlights(description: string | null | undefined): PropertyHighlights { ... }
export function generateConsultativeSummary(property: any, highlights: PropertyHighlights): string { ... }
export function formatPropertyMessage(property: any): string { ... }
export function generateConsultativeQuestion(property: any, highlights: PropertyHighlights, clientName?: string): string { ... }
export async function sendLeadToC2S(supabase: any, params: Record<string, any>, phoneNumber: string, conversationHistory: string, contactName?: string): Promise<{ success: boolean; c2s_lead_id?: string; error?: string }> { ... }
```

**Linhas movidas:** ~921-1402

---

### 6. `_shared/qualification.ts` (NOVO)
**Conteúdo:** Sistema de qualificação de leads.

```typescript
import { QualificationData, QualificationProgress, ExtractedQualificationData, FlexibilizationResult } from './types.ts';
import { normalizeNeighborhood, getAllNeighborhoods, FLORIANOPOLIS_REGIONS } from './regions.ts';

export function extractQualificationData(message: string): ExtractedQualificationData { ... }
export async function updateQualificationData(supabase: any, phoneNumber: string, newData: ExtractedQualificationData, forceUpdate?: boolean): Promise<void> { ... }
export function hasMinimumCriteriaToSearch(department: string | null, progress: QualificationProgress): boolean { ... }
export function buildSearchParamsFromQualification(department: string | null, qualData: QualificationData | null): Record<string, any> | null { ... }
export async function getQualificationProgress(supabase: any, phoneNumber: string): Promise<{ progress: QualificationProgress; data: QualificationData | null }> { ... }
export function getNextQualificationQuestion(progress: QualificationProgress, department: string): string | null { ... }
export function buildContextSummary(qualificationData: QualificationData | null): string { ... }
export function isLoopingQuestion(aiResponse: string, qualificationData: QualificationData | null): boolean { ... }
export function detectFlexibilization(message: string): FlexibilizationResult { ... }
```

**Linhas movidas:** ~1587-2170, ~2225-2356

---

### 7. `_shared/audio.ts` (NOVO)
**Conteúdo:** Transcrição de áudio e TTS.

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AudioConfig, AudioResult } from './types.ts';

export async function transcribeAudio(supabase: any, audioUrl: string): Promise<string | null> { ... }
export async function getAudioConfig(supabase: any): Promise<AudioConfig | null> { ... }
export async function generateAudioResponse(text: string, audioConfig: AudioConfig): Promise<AudioResult | null> { ... }
```

**Linhas movidas:** ~2794-2923

---

## Arquivo Principal Refatorado: `make-webhook/index.ts`

O arquivo final terá apenas:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Importar módulos compartilhados
import { MakeWebhookRequest, MediaInfo, DepartmentType, ... } from "../_shared/types.ts";
import { normalizePhoneNumber, getPhoneVariations, validateAIResponse, ... } from "../_shared/utils.ts";
import { normalizeNeighborhood, expandRegionToNeighborhoods } from "../_shared/regions.ts";
import { buildLocacaoPrompt, getPromptForDepartment, toolsWithVista, ... } from "../_shared/prompts.ts";
import { searchPropertiesWithFallback, formatPropertyMessage, sendLeadToC2S, ... } from "../_shared/property.ts";
import { extractQualificationData, updateQualificationData, getQualificationProgress, ... } from "../_shared/qualification.ts";
import { transcribeAudio, getAudioConfig, generateAudioResponse } from "../_shared/audio.ts";

const corsHeaders = { ... };

// Funções de banco de dados (manter aqui - específicas do webhook)
async function getAIAgentConfig(supabase: any) { ... }
async function getAIBehaviorConfig(supabase: any) { ... }
async function findOrCreateConversation(...) { ... }
async function saveMessage(...) { ... }
async function getConversationHistory(...) { ... }
async function getConsultativeState(...) { ... }
async function updateConsultativeState(...) { ... }
// ... outras funções de DB

// MAIN HANDLER (serve)
serve(async (req) => {
  // Lógica de orquestração principal (~400 linhas)
});
```

---

## Passos de Implementação

| Etapa | Ação | Arquivos Afetados |
|-------|------|-------------------|
| 1 | Expandir `_shared/types.ts` com todas as interfaces | `_shared/types.ts` |
| 2 | Consolidar `_shared/regions.ts` | `_shared/regions.ts` |
| 3 | Expandir `_shared/utils.ts` com todas as funções utilitárias | `_shared/utils.ts` |
| 4 | Criar `_shared/prompts.ts` com todos os templates | `_shared/prompts.ts` (novo) |
| 5 | Criar `_shared/property.ts` com busca e formatação | `_shared/property.ts` (novo) |
| 6 | Criar `_shared/qualification.ts` com qualificação | `_shared/qualification.ts` (novo) |
| 7 | Criar `_shared/audio.ts` com áudio | `_shared/audio.ts` (novo) |
| 8 | Refatorar `make-webhook/index.ts` para importar módulos | `make-webhook/index.ts` |
| 9 | Remover arquivos locais duplicados | Deletar `make-webhook/types.ts`, `regions.ts`, `utils.ts` |
| 10 | Testar deploy da função | N/A |

---

## Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Linhas no `index.ts` | 3.880 | ~800-1.000 |
| Tempo de bundle | Timeout | < 30s |
| Manutenibilidade | Baixa | Alta |
| Reutilização | Nenhuma | Alta (outras funções podem usar) |

---

## Considerações Técnicas

1. **Imports Deno:** Usar caminhos relativos (`../`) para importar módulos da pasta `_shared`
2. **Dependências circulares:** Evitar que `prompts.ts` importe de `qualification.ts` que importa de `prompts.ts`
3. **Testes:** Após refatoração, testar com um lead real via Make.com
4. **Deploy incremental:** Se o deploy ainda falhar, dividir ainda mais (ex: separar DB functions)
