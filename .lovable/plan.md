
# Plano: Implementar Fluxo de Atendimento Consultivo (1 a 1)

## Resumo da Mudança

Transformar o atendimento da IA de "enviar lista de imóveis" para um fluxo consultivo onde cada imóvel é apresentado individualmente, aguardando a resposta do cliente antes de prosseguir.

---

## Mudanças Principais

### 1. Novo Estado de Conversa: "Apresentação de Imóvel"

Adicionar campos na tabela `conversation_states` para rastrear:
- `current_property_index` - Qual imóvel está sendo apresentado (0, 1, 2...)
- `pending_properties` - Array de imóveis encontrados na busca
- `awaiting_property_feedback` - Se está aguardando resposta sobre um imóvel

```sql
-- Migration necessária
ALTER TABLE conversation_states 
ADD COLUMN IF NOT EXISTS current_property_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS awaiting_property_feedback boolean DEFAULT false;
```

> Nota: O campo `pending_properties` já existe na tabela.

---

### 2. Atualizar Prompt da IA

Modificar `buildLocacaoPrompt` e `buildVendasPrompt` para incluir as novas regras:

**Regras a adicionar:**
```text
🏠 REGRAS PARA APRESENTAR IMÓVEIS:
- NUNCA envie lista grande. Sempre 1 imóvel por vez.
- Estrutura obrigatória:
  1. Contexto: "Encontrei um imóvel que pode combinar com o que você busca."
  2. Dados: tipo, bairro, quartos, preço, diferencial
  3. Pergunta: "Esse imóvel faz sentido pra você?"
- AGUARDE a resposta antes de mostrar outro imóvel
- Se cliente disser NÃO: pergunte o que não se encaixou
- Se cliente demonstrar INTERESSE: iniciar encaminhamento ao consultor

🚫 REGRA CRÍTICA - NUNCA AGENDAR VISITAS:
- NUNCA ofereça datas, horários ou confirmação de visita
- SEMPRE diga: "Quem vai agendar a visita é um consultor da Smolka Imóveis"
- SEMPRE diga: "Vou te conectar com um consultor especializado"

📤 FLUXO DE ENCAMINHAMENTO C2S:
Quando cliente demonstrar interesse ("gostei", "quero visitar", "pode marcar"):
1. Confirmar: "Perfeito! Posso te conectar com um consultor para organizar a visita?"
2. Se concordar: coletar/confirmar nome, telefone, código do imóvel
3. Usar enviar_lead_c2s com todos os dados
4. Mensagem final: "Pronto! Um consultor vai entrar em contato para tirar dúvidas e agendar a visita."
5. NÃO oferecer mais imóveis após transferência (a menos que cliente peça)
```

---

### 3. Modificar Lógica de Busca de Imóveis

No `make-webhook`, após `buscar_imoveis`:

**Antes:**
```javascript
propertiesToSend = searchResult.properties.slice(0, 3);
aiResponse = `Achei ${propertiesToSend.length} opções pra você! 🎉`;
```

**Depois:**
```javascript
// Salvar TODOS os imóveis encontrados no estado
const allProperties = searchResult.properties.slice(0, 5);
await updateConversationState(supabase, phoneNumber, {
  pending_properties: allProperties,
  current_property_index: 0,
  awaiting_property_feedback: true
});

// Enviar apenas O PRIMEIRO imóvel
propertiesToSend = [allProperties[0]];

// IA gera mensagem consultiva
aiResponse = `Encontrei um imóvel que pode combinar com o que você busca! 🏠`;
```

---

### 4. Nova Lógica de Processamento de Feedback

Adicionar função para detectar feedback do cliente sobre imóvel apresentado:

```javascript
function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'neutral' {
  const positive = /gostei|interess|visitar|marcar|quero|esse|perfeito|ótimo|bom|show|pode ser/i;
  const negative = /não|caro|longe|pequeno|grande|outro|próximo|diferente|menos|mais/i;
  
  if (positive.test(message)) return 'positive';
  if (negative.test(message)) return 'negative';
  return 'neutral';
}
```

**Fluxo de decisão:**
1. Se `positive` → Iniciar fluxo C2S
2. Se `negative` → Perguntar o que não se encaixou e mostrar próximo imóvel
3. Se `neutral` → Pedir esclarecimento

---

### 5. Atualizar Resposta JSON para Make.com

Adicionar campo para indicar estado da apresentação:

```json
{
  "success": true,
  "result": "Encontrei um imóvel que pode combinar...",
  "properties": [{ /* apenas 1 imóvel */ }],
  "presentation_state": {
    "awaiting_feedback": true,
    "current_index": 0,
    "total_found": 5,
    "property_code": "7558"
  },
  "c2s_transferred": false
}
```

---

## Diagrama do Novo Fluxo

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO CONSULTIVO 1 A 1                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Cliente informa critérios]                                    │
│           │                                                     │
│           ▼                                                     │
│  [IA busca imóveis no Vista CRM]                               │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │ Salvar TODOS em pending_properties    │                     │
│  │ Marcar awaiting_feedback = true       │                     │
│  │ Enviar APENAS 1 imóvel                │                     │
│  └───────────────────────────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  [IA: "Encontrei um imóvel... Faz sentido?"]                   │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │         AGUARDA RESPOSTA              │                     │
│  └───────────────────────────────────────┘                     │
│           │                                                     │
│     ┌─────┴─────┐                                               │
│     │           │                                               │
│  [GOSTEI]    [NÃO GOSTEI]                                      │
│     │           │                                               │
│     ▼           ▼                                               │
│  ┌───────┐   ┌───────────────────────┐                         │
│  │ C2S   │   │ Perguntar motivo      │                         │
│  │ Flow  │   │ Mostrar PRÓXIMO       │                         │
│  └───────┘   │ imóvel (se houver)    │                         │
│              └───────────────────────┘                         │
│                                                                 │
│  ═══════════════════════════════════════                       │
│                                                                 │
│  [FLUXO C2S - NUNCA AGENDAR VISITA]                            │
│           │                                                     │
│           ▼                                                     │
│  "Perfeito! Posso te conectar com um consultor?"               │
│           │                                                     │
│           ▼                                                     │
│  [Coletar/Confirmar: Nome, Telefone, Imóvel]                   │
│           │                                                     │
│           ▼                                                     │
│  [Chamar enviar_lead_c2s com dados]                            │
│           │                                                     │
│           ▼                                                     │
│  "Pronto! Consultor vai entrar em contato!"                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | Atualizar prompts, lógica de busca, processamento de feedback |
| Migration SQL | Adicionar campos na tabela `conversation_states` |

---

## Exemplo de Diálogo Esperado

**Cliente:** "Quero alugar um apartamento de 2 quartos no Centro"

**Helena:** "Encontrei um imóvel que pode combinar com o que você busca! 🏠"
[Envia foto do imóvel via Make.com]
"Apartamento de 2 dormitórios, 75m², no Centro, com 1 vaga. Valor: R$ 2.500/mês. Prédio com área de lazer completa.

Esse imóvel faz sentido pra você?"

**Cliente:** "Achei um pouco caro"

**Helena:** "Entendi! Você gostaria de ver opções até quanto? Assim consigo buscar algo mais adequado pro seu orçamento 😊"

**Cliente:** "Até 2 mil"

**Helena:** "Encontrei outra opção interessante! 🏠"
[Envia foto do 2º imóvel]
"Apartamento de 2 dormitórios, 60m², no Centro, 1 vaga. Valor: R$ 1.900/mês.

Esse te agrada mais?"

**Cliente:** "Esse gostei! Quero visitar"

**Helena:** "Que bom que esse imóvel fez sentido! 😊

Quem vai agendar a visita e te atender pessoalmente é um consultor da Smolka Imóveis.

Posso confirmar seus dados para conectar você?
- Nome: [confirma]
- WhatsApp: [confirma]
- Código do imóvel: XXXX"

**Cliente:** "Pode confirmar, está tudo certo"

**Helena:** "Pronto! 🎉 Já encaminhei seus dados e o imóvel de interesse para um consultor da Smolka Imóveis.

Ele vai entrar em contato com você para tirar dúvidas e agendar a visita com toda a atenção que você merece.

Obrigada pela confiança! 😊"

---

## Resumo Técnico

1. **Migration**: Adicionar `current_property_index` e `awaiting_property_feedback` em `conversation_states`
2. **Prompts**: Atualizar `buildLocacaoPrompt` e `buildVendasPrompt` com novas regras
3. **Lógica de busca**: Salvar todos, enviar 1, marcar aguardando feedback
4. **Análise de feedback**: Função para detectar se cliente gostou ou não
5. **Fluxo C2S**: Confirmar interesse, coletar dados, transferir, NÃO oferecer mais imóveis
6. **Resposta JSON**: Incluir estado da apresentação para Make.com
