

# Análise Completa: Make.com Blueprint vs make-webhook

## Estrutura do Blueprint Make.com

Após analisar o blueprint completo, identifiquei o fluxo:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  MÓDULO 1: watchEvents2                                                          │
│  "Recebe a mensagem do cliente" (WhatsApp Webhook)                              │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  MÓDULO 14: HTTP Request                                                         │
│  URL: supabase.co/functions/v1/make-webhook                                     │
│  FILTRO: "Apenas mensagens reais" (messages exists AND length > 0)              │
│  Envia: phone, message, message_type, media_url, button_text, etc.              │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│  MÓDULO 23: Router (BasicRouter)                                                 │
│  Divide o fluxo em DUAS rotas principais                                        │
└─────────────┬─────────────────────────────────────────────────────┬─────────────┘
              │                                                     │
              ▼                                                     ▼
┌─────────────────────────────────┐          ┌───────────────────────────────────┐
│  ROTA 1: Com Propriedades       │          │  ROTA 2: Sem Propriedades         │
│  FILTRO: 14.data.properties     │          │  FILTRO: 14.data.properties       │
│          EXISTS                 │          │          NOT EXISTS               │
└─────────────┬───────────────────┘          └───────────────────┬───────────────┘
              │                                                   │
              ▼                                                   ▼
┌─────────────────────────────────┐          ┌───────────────────────────────────┐
│  MÓDULO 25: HTTP send-wa-media  │          │  Sub-router com 3 opções:         │
│  Envia imóveis com foto         │          │  - Texto (Módulo 11)              │
│                                 │          │  - Audio (Módulo 16)              │
│  DEPOIS                         │          │  - Template triagem (Módulo 18)   │
│  ↓                              │          └───────────────────────────────────┘
│  MÓDULO 24: sendMessage         │
│  "body": {{14.data.result}}     │ ← AQUI ESTÁ O PROBLEMA!
└─────────────────────────────────┘
```

---

## Problema Identificado

### Os módulos do Make dependem de `14.data.result`:

| Módulo | Condição/Uso | Esperado |
|--------|--------------|----------|
| **24** (Texto após imóveis) | `body: {{14.data.result}}` | Texto de resposta |
| **11** (Texto simples) | `body: {{14.data.result}}` | Texto de resposta |
| **18** (Template) | `FILTRO: 14.data.send_template EXISTS` | Campo existe |
| **16** (Audio) | `link: {{14.data.audio.url}}` | URL de áudio |

### Os early returns atuais NÃO retornam `result`:

**Linha 3055-3058 (Status callback):**
```javascript
return { success: true, skipped: true, reason: 'status_callback' }
// ❌ SEM result - Make trava
```

**Linha 3163-3166 (Villa Maggiore):**
```javascript
return { success: true, skipped: true, reason: 'handled_by_direct_api' }
// ❌ SEM result - Make trava
```

---

## Consequência do Problema

Quando o `make-webhook` retorna sem o campo `result`:

1. **O Router (Módulo 23)** não consegue decidir qual rota seguir
2. **Os filtros** (`14.data.result`, `14.data.properties`) não encontram dados
3. **O cenário para** e aguarda indefinidamente
4. **O cliente não recebe resposta** mesmo que a mensagem tenha sido processada

---

## Solução Proposta

### Fase 1: Adicionar `result` em todos os early returns

Modificar todos os pontos de "skip" para incluir o campo `result`:

**Status callbacks (linha 3055-3058):**
```javascript
return new Response(
  JSON.stringify({ 
    success: true, 
    skipped: true, 
    reason: 'status_callback',
    result: null  // ← ADICIONAR: Make vai ignorar mas não vai travar
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

**Villa Maggiore (linha 3163-3166):**
```javascript
// OPÇÃO A: Apenas skip com result null
return new Response(
  JSON.stringify({ 
    success: true, 
    skipped: true, 
    reason: 'handled_by_direct_api',
    result: null  // ← Make não vai tentar enviar mensagem
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// OPÇÃO B: Chamar ai-arya-vendas e retornar a resposta (mais completo)
```

### Fase 2: Ajustar filtros no Make.com (Opcional)

Para maior robustez, o Make.com poderia ter um filtro adicional:
- Antes de enviar mensagem: verificar se `14.data.result` não é nulo e não é vazio

---

## Fluxo Corrigido

```text
┌──────────────────────────┐
│     Mensagem Recebida    │
│      (make-webhook)      │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  É status callback?      │
└────────────┬─────────────┘
             │
     ┌───────┴───────┐
     │ SIM           │ NÃO
     ▼               ▼
┌──────────────┐ ┌──────────────────────────┐
│ result: null │ │  É lead Villa Maggiore?  │
│ (skip)       │ └────────────┬─────────────┘
└──────────────┘              │
                      ┌───────┴───────┐
                      │ SIM           │ NÃO
                      ▼               ▼
              ┌──────────────┐ ┌──────────────────┐
              │ Chamar       │ │ Processamento    │
              │ ai-arya-     │ │ normal Helena    │
              │ vendas       │ │                  │
              │              │ │ result: "texto"  │
              │ result: resp │ │ properties: []   │
              └──────────────┘ │ send_template:   │
                               └──────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | Adicionar `result: null` nos early returns (linhas 3055-3058 e 3163-3166) |

---

## Opção Recomendada: B (Roteamento Completo)

Para leads do Villa Maggiore que chegam pelo Make.com:

1. **Ao invés de skip**, chamar `ai-arya-vendas` internamente
2. **Retornar a resposta** no campo `result`
3. **Make envia a mensagem** normalmente

Isso garante que:
- O cliente sempre recebe resposta, independente do canal
- A separação entre números continua funcionando
- Não há necessidade de alterar o cenário no Make.com

---

## Teste de Validação

| Cenário | Antes | Depois |
|---------|-------|--------|
| Lead Villa Maggiore via Make | Trava (sem `result`) | Responde via ai-arya-vendas |
| Status callback | Trava (sem `result`) | Ignora silenciosamente |
| Lead locação normal | Funciona | Funciona (inalterado) |

