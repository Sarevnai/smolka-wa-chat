
# Migração Completa: Funcionalidades do ai-virtual-agent para make-webhook

## Resumo Executivo

Este plano migrará todas as funcionalidades do agente virtual Aimee (ai-virtual-agent) para o webhook do Make, exceto as funcionalidades de marketing. Após a implementação, o make-webhook terá as mesmas capacidades de:
- Busca de imóveis no Vista CRM
- Qualificação de leads com SPIN
- Configuração dinâmica via banco de dados
- Processamento de links de imóveis
- Técnicas de rapport e gatilhos mentais
- Áudio via ElevenLabs
- Transferência para C2S

## Componentes a Migrar

### 1. Mapeamento de Regiões de Florianópolis

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| FLORIANOPOLIS_REGIONS | Linhas 19-63 | Não existe |
| getAllNeighborhoods() | Linhas 66-72 | Não existe |
| findRegionByNeighborhood() | Linhas 75-86 | Não existe |
| getNeighborhoodsByRegion() | Linhas 89-96 | Não existe |
| stringSimilarity() | Linhas 99-134 | Não existe |
| normalizeNeighborhood() | Linhas 137-173 | Não existe |
| isRegionName() | Linhas 176-182 | Não existe |
| expandRegionToNeighborhoods() | Linhas 185-222 | Não existe |
| generateRegionKnowledge() | Linhas 225-248 | Não existe |

### 2. Extração de Links de Imóveis

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| extractPropertyCodeFromUrl() | Linhas 262-300 | Não existe |
| extractInfoFromUrlText() | Linhas 305-335 | Não existe |
| referencesEarlierProperty() | Linhas 340-342 | Não existe |
| containsPropertyUrl() | Linhas 347-351 | Não existe |

### 3. Interface de Configuração (AIAgentConfig)

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| AIAgentConfig interface | Linhas 360-422 | Não existe |
| defaultConfig | Linhas 424-484 | Não existe |
| toneDescriptions | Linhas 486-491 | Não existe |
| Humanization (emojiSets, humanPhrases) | Linhas 493-523 | Não existe |
| getRandomEmoji(), getRandomPhrase() | Linhas 504-523 | Não existe |
| extractCustomerName() | Linhas 526-566 | Existe (extractNameFromMessage) |
| didAskForName() | Linhas 569-577 | Não existe |

### 4. Ferramentas OpenAI (Tools)

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| buscar_imoveis tool | Linhas 580-621 | Não existe |
| enviar_lead_c2s tool | Linhas 624-660 | Existe parcialmente |
| FORBIDDEN_RESPONSE_PATTERNS | Linhas 664-685 | Não existe |
| validateAIResponse() | Linhas 687-697 | Não existe |
| FALLBACK_RESPONSE | Linha 699 | Não existe |

### 5. Prompt Builder Avançado

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| buildSystemPrompt() | Linhas 701-1025 | buildVirtualAgentPrompt() (genérico) |
| Fluxo de 5 Etapas Laís | Linhas 745-896 | Não existe |
| Business Context | Linhas 898-917 | Não existe |
| SPIN Qualification | Linhas 993-1017 | Não existe |
| Técnicas de Rapport | Linhas 787-804 | Não existe |
| Gatilhos Mentais | Linhas 957-992 | Não existe |

### 6. Busca e Formatação de Imóveis

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| searchProperties() | Linhas 1138-1181 | Não existe |
| formatPropertyMessage() | Linhas 1184-1215 | Não existe |
| formatPropertyDetailsLikeLais() | Linhas 1218-1282 | Não existe |
| getPropertyByListingId() | Linhas 1287-1306 | Não existe |
| sendLeadToC2S() | Linhas 1308-1338 | Existe parcial |

### 7. AI Behavior Config

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| EssentialQuestion interface | Linhas 1467-1476 | Não existe |
| AIBehaviorConfig interface | Linhas 1478-1486 | Não existe |
| getAIBehaviorConfig() | Linhas 1490-1497 | Não existe |
| isPortalLead() | Linhas 1501-1552 | Não existe |
| updateLeadQualification() | Linhas 1557-1576 | Não existe |
| detectDisqualificationReason() | Linhas 1581-1607 | Não existe |
| calculateQualificationScore() | Linhas 1612-1634 | Não existe |
| extractAnswerFromMessage() | Linhas 1639-1677 | Não existe |
| buildPortalLeadPrompt() | Linhas 1682-1783 | Não existe |

### 8. WhatsApp API Functions

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| sendWhatsAppMessage() | Existe | Não existe (retorna para Make) |
| sendWhatsAppImage() | Existe | Não existe (retorna para Make) |
| sendWhatsAppAudio() | Existe | Não existe (retorna para Make) |
| fragmentMessage() | Linhas 1031-1094 | Não existe |
| sanitizeAIMessage() | Linhas 1102-1136 | Não existe |

### 9. Funções de Database/Estado

| Recurso | ai-virtual-agent | make-webhook |
|---------|-----------------|--------------|
| getRecentMessages() | Linhas 2168-2177 | Não existe |
| updateConversationStage() | Linhas 1996-2024 | Não existe |
| saveContactPreference() | Existe | Não existe |
| getContactPreference() | Linhas 3597-3600 | Não existe |

## Arquitetura da Migração

```text
┌────────────────────────────────────────────────────────────────────────┐
│                         make-webhook ATUALIZADO                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 1: CONFIGURAÇÃO (busca do banco)                          │  │
│  │ • getAIAgentConfig() → system_settings.ai_agent_config           │  │
│  │ • getAIBehaviorConfig() → ai_behavior_config                     │  │
│  │ • Carrega: nome, tom, serviços, rapport, triggers, SPIN          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 2: CONHECIMENTO LOCAL                                     │  │
│  │ • FLORIANOPOLIS_REGIONS                                          │  │
│  │ • normalizeNeighborhood(), expandRegionToNeighborhoods()         │  │
│  │ • generateRegionKnowledge()                                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 3: PROCESSAMENTO DE MENSAGENS                             │  │
│  │ • Link de imóvel detectado → getPropertyByListingId()            │  │
│  │ • Referência a imóvel anterior → busca histórico                 │  │
│  │ • Botão clicado → inferDepartmentFromButton()                    │  │
│  │ • Texto normal → fluxo de qualificação                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 4: PROMPTS DINÂMICOS                                      │  │
│  │ • buildLocacaoPrompt() - com ferramenta buscar_imoveis           │  │
│  │ • buildVendasPrompt() - com ferramenta buscar_imoveis + C2S      │  │
│  │ • buildAdminPrompt() - classificação de demandas                 │  │
│  │ • buildPortalLeadPrompt() - qualificação estilo Laís             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 5: FERRAMENTAS (OpenAI Function Calling)                  │  │
│  │ • buscar_imoveis → vista-search-properties                       │  │
│  │ • enviar_lead_c2s → c2s-create-lead                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                 │                                      │
│                                 ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ CAMADA 6: RESPOSTA PARA MAKE                                     │  │
│  │ {                                                                │  │
│  │   result: "Achei uma opção boa!",                                │  │
│  │   properties: [{ foto_destaque, preco, ... }],                   │  │
│  │   audio: { url, isVoiceMessage },                                │  │
│  │   send_template: { name: "triagem" }                             │  │
│  │ }                                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Alterações Técnicas Detalhadas

### Arquivo: supabase/functions/make-webhook/index.ts

#### Seção 1: Interfaces e Constantes (Início do arquivo, após imports)

Adicionar as interfaces e constantes que existem no ai-virtual-agent:

- `AIAgentConfig` interface completa (linhas 360-422 do original)
- `AIBehaviorConfig` interface
- `EssentialQuestion` interface
- `defaultConfig` objeto
- `FLORIANOPOLIS_REGIONS` mapeamento
- `emojiSets` e `humanPhrases`
- `FORBIDDEN_RESPONSE_PATTERNS`
- `FALLBACK_RESPONSE`

#### Seção 2: Funções Utilitárias de Região

Migrar todas as funções de manipulação de bairros:

- `getAllNeighborhoods()`
- `findRegionByNeighborhood()`
- `getNeighborhoodsByRegion()`
- `stringSimilarity()` (para correção de erros de digitação)
- `normalizeNeighborhood()`
- `isRegionName()`
- `expandRegionToNeighborhoods()`
- `generateRegionKnowledge()`

#### Seção 3: Funções de Extração de Links

Migrar funções para processar links de imóveis:

- `extractPropertyCodeFromUrl()`
- `extractInfoFromUrlText()`
- `referencesEarlierProperty()`
- `containsPropertyUrl()`

#### Seção 4: Funções de Configuração

Criar funções para buscar configurações do banco:

```typescript
async function getAIAgentConfig(supabase: any): Promise<AIAgentConfig> {
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'ai_agent_config')
    .maybeSingle();
  
  return data?.setting_value 
    ? { ...defaultConfig, ...data.setting_value }
    : defaultConfig;
}

async function getAIBehaviorConfig(supabase: any): Promise<AIBehaviorConfig | null> {
  const { data } = await supabase
    .from('ai_behavior_config')
    .select('*')
    .limit(1)
    .maybeSingle();
  return data;
}
```

#### Seção 5: Tools para OpenAI

Criar array de ferramentas completo:

```typescript
const toolsWithVista = [
  {
    type: "function",
    function: {
      name: "buscar_imoveis",
      description: "Busca imóveis no catálogo da Smolka Imóveis...",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["apartamento", "casa", "terreno", ...] },
          bairro: { type: "string", description: "Nome do bairro..." },
          finalidade: { type: "string", enum: ["venda", "locacao"] },
          preco_max: { type: "number" },
          quartos: { type: "number" }
        },
        required: ["finalidade"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "enviar_lead_c2s",
      description: "Transferir lead qualificado para corretor...",
      parameters: { ... }
    }
  }
];
```

#### Seção 6: Funções de Busca e Formatação

Migrar funções de busca do Vista:

- `searchProperties()` - chama vista-search-properties
- `getPropertyByListingId()` - chama vista-get-property
- `formatPropertyMessage()` - formata para WhatsApp
- `formatPropertyDetailsLikeLais()` - formato Laís

#### Seção 7: Prompt Builders Avançados

Substituir `buildVirtualAgentPrompt()` genérico por prompts específicos:

```typescript
function buildLocacaoPrompt(config: AIAgentConfig, contactName?: string): string {
  // Prompt completo estilo Laís para locação
  // Inclui: fluxo de 5 etapas, conhecimento local, SPIN
  return `Você é ${config.agent_name} da ${config.company_name}...
  
  📍 FLUXO DE ATENDIMENTO - LOCAÇÃO:
  1. QUALIFICAÇÃO: Coletar região, tipo, quartos, faixa de preço
  2. BUSCA: Usar buscar_imoveis assim que tiver 2+ critérios
  3. APRESENTAÇÃO: Mostrar imóveis encontrados
  4. FOLLOW-UP: Perguntar se faz sentido
  5. AGENDAMENTO: Coletar dados para visita
  
  ${generateRegionKnowledge()}
  
  ⚠️ REGRAS CRÍTICAS:
  - NUNCA repita perguntas já respondidas
  - Use buscar_imoveis IMEDIATAMENTE com 2+ critérios
  - Mensagens curtas e diretas`;
}

function buildVendasPrompt(config: AIAgentConfig, contactName?: string): string {
  // Similar ao de locação, mas com foco em compra/investimento
  // Adiciona lógica de enviar_lead_c2s
}

function buildAdminPrompt(config: AIAgentConfig, contactName?: string): string {
  // Prompt para setor administrativo
  // Classificação de demandas, tags, notificações
}
```

#### Seção 8: Processamento de Tool Calls

Adicionar lógica para processar ferramentas:

```typescript
// Após receber resposta do OpenAI com tool_calls
if (result.toolCalls && result.toolCalls.length > 0) {
  for (const toolCall of result.toolCalls) {
    if (toolCall.function.name === 'buscar_imoveis') {
      const args = JSON.parse(toolCall.function.arguments);
      
      // Normalizar bairro antes da busca
      if (args.bairro) {
        const expansion = expandRegionToNeighborhoods(args.bairro);
        if (expansion.isRegion) {
          args.bairro = expansion.neighborhoods[0];
        } else {
          args.bairro = normalizeNeighborhood(args.bairro).normalized;
        }
      }
      
      const searchResult = await supabase.functions.invoke('vista-search-properties', {
        body: args
      });
      
      if (searchResult.data?.success && searchResult.data.properties?.length > 0) {
        // Retornar imóveis para Make enviar
        propertiesToSend = searchResult.data.properties;
      }
    }
    
    if (toolCall.function.name === 'enviar_lead_c2s') {
      // Chamar c2s-create-lead
      // Marcar conversa como transferida
    }
  }
}
```

#### Seção 9: Atualizar Fluxo Principal

Modificar o handler principal para:

1. Carregar configurações do banco no início
2. Detectar e processar links de imóveis
3. Usar prompts específicos por departamento após triagem
4. Retornar imóveis e áudio no JSON de resposta

```typescript
// No início do handler
const config = await getAIAgentConfig(supabase);
const behaviorConfig = await getAIBehaviorConfig(supabase);

// Após triagem completada
if (currentStage === 'completed') {
  const conversation = await findOrCreateConversation(supabase, phoneNumber);
  const department = conversation?.department_code;
  
  // Escolher prompt baseado no departamento
  let systemPrompt: string;
  let tools = toolsWithVista;
  
  if (department === 'locacao') {
    systemPrompt = buildLocacaoPrompt(config, existingName);
  } else if (department === 'vendas') {
    systemPrompt = buildVendasPrompt(config, existingName);
  } else if (department === 'administrativo') {
    systemPrompt = buildAdminPrompt(config, existingName);
    tools = []; // Admin não precisa de buscar_imoveis
  }
  
  const result = await callOpenAI(systemPrompt, history, aiPromptMessage, tools);
  // ... processar tool calls
}
```

#### Seção 10: Resposta Enriquecida para Make

Atualizar formato de resposta:

```typescript
return new Response(
  JSON.stringify({
    success: true,
    result: aiResponse,
    agent: 'helena',
    department: department,
    // Imóveis encontrados para Make enviar
    properties: propertiesToSend.length > 0 ? propertiesToSend.slice(0, 3).map(p => ({
      codigo: p.codigo,
      foto_destaque: p.foto_destaque,
      tipo: p.tipo,
      bairro: p.bairro,
      quartos: p.quartos,
      preco_formatado: p.preco_formatado,
      link: p.link
    })) : undefined,
    // Áudio para Make enviar
    audio: audioResult ? {
      url: audioResult.audioUrl,
      isVoiceMessage: audioResult.isVoiceMessage
    } : undefined,
    // Template para Make enviar
    send_template: sendTriageTemplate ? {
      name: 'triagem'
    } : undefined,
    // C2S transfer status
    c2s_transferred: c2sTransferred,
    // Media processing info
    media_processed: mediaProcessed
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

## Estrutura Final do JSON de Resposta

O Make.com receberá um JSON enriquecido e deverá configurar rotas para:

```json
{
  "success": true,
  "result": "Achei uma opção boa pra você!",
  "agent": "helena",
  "department": "locacao",
  
  "properties": [
    {
      "codigo": "7558",
      "foto_destaque": "https://...",
      "tipo": "Apartamento",
      "bairro": "Centro",
      "quartos": 2,
      "preco_formatado": "R$ 2.500/mês",
      "link": "https://smolkaimoveis.com.br/imovel/7558"
    }
  ],
  
  "audio": {
    "url": "https://...",
    "isVoiceMessage": false
  },
  
  "send_template": {
    "name": "triagem"
  },
  
  "c2s_transferred": false
}
```

## Configurações Make.com Necessárias

Após a implementação, o usuário precisará configurar rotas no Make:

1. **Rota de Texto**: Se `result` existe E `properties` não existe E `send_template` não existe
2. **Rota de Imóveis**: Se `properties` existe → Enviar imagem + texto formatado para cada imóvel
3. **Rota de Template**: Se `send_template` existe → Enviar template oficial
4. **Rota de Áudio**: Se `audio` existe → Enviar áudio via WhatsApp

## Resumo das Alterações

| Seção | Linhas Afetadas | Descrição |
|-------|----------------|-----------|
| Interfaces | ~10-100 (novo) | Adicionar todas as interfaces do ai-virtual-agent |
| Constantes | ~100-300 (novo) | FLORIANOPOLIS_REGIONS, emojiSets, patterns |
| Funções Região | ~300-450 (novo) | 8 funções de manipulação de bairros |
| Funções Link | ~450-520 (novo) | 4 funções de extração de links |
| Config Loaders | ~520-570 (novo) | getAIAgentConfig, getAIBehaviorConfig |
| Tools Array | ~426-446 (modificar) | Expandir de 1 para 2 ferramentas |
| Prompt Builders | ~213-231 (substituir) | 3 novos prompts específicos por departamento |
| Search/Format | ~570-700 (novo) | searchProperties, formatPropertyMessage |
| Tool Processing | ~1127-1153 (expandir) | Adicionar handler para buscar_imoveis |
| Main Handler | ~1170-1423 (modificar) | Usar configurações do banco e prompts dinâmicos |

## Benefícios Após Implementação

1. **Busca de Imóveis Funcional**: Cliente diz "Centro" → IA busca no Vista → Retorna imóveis
2. **Configuração Centralizada**: Alterações na "Minha Aimee" afetam o Make
3. **Correção de Erros**: "Tridade" → "Trindade" automaticamente
4. **Qualificação SPIN**: Perguntas estruturadas para qualificar leads
5. **Rapport Automático**: Uso do nome, espelhamento de tom
6. **Transferência C2S**: Leads qualificados enviados automaticamente
