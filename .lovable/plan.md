
# Plano: Limpeza de Código Incorreto e Atualização do ai-vendas

## Problema Identificado

O `make-webhook` contém um bloco de código (linhas 3155-3212) que tenta rotear leads do "Villa Maggiore" para `ai-vendas`. Este código está **INCORRETO** porque:

1. **Villa Maggiore NUNCA chega pelo Make.com** - Ele só entra pela API Oficial
2. O código retorna `result: null` que trava o fluxo do Make.com
3. É código morto/incorreto que nunca deveria ter sido adicionado

---

## Arquitetura Correta (Confirmada)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CANAL 1: API OFICIAL META                            │
│                        Número: 48 2398-0016                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  ENTRADA: whatsapp-webhook                                                  │
│  LEADS: Landing pages, Campanhas de Marketing (Villa Maggiore)              │
│  FUNÇÕES: ai-vendas, ai-marketing-agent                                     │
│  ENVIO: Direto via send-wa-message / send-wa-media                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CANAL 2: MAKE.COM                                    │
│                        Número: 48 9 9163-1011                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ENTRADA: make-webhook (via HTTP Request do Make)                           │
│  LEADS: Portais (ZAP, OLX, etc.), Atendimento geral                         │
│  DEPARTAMENTOS: Locação, Vendas, Administrativo                             │
│  FUNÇÃO: make-webhook (Helena)                                              │
│  RETORNO: JSON com result → Make.com envia                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Importante:** Um mesmo contato pode existir nos dois canais, mas são tratamentos completamente isolados.

---

## Alterações Necessárias

### 1. Remover Código Incorreto do make-webhook

**Arquivo:** `supabase/functions/make-webhook/index.ts`

**Ação:** Remover as linhas 3155-3212 (bloco de roteamento para ai-vendas)

**Código a ser removido:**
```typescript
// REMOVER LINHAS 3155-3212
const DIRECT_API_DEVELOPMENTS = ['villa maggiore'];

if (developmentLead || mentionedDevelopment) {
  const devInfo = developmentLead || mentionedDevelopment!;
  const devNameLower = (devInfo.development_name || '').toLowerCase();
  
  if (DIRECT_API_DEVELOPMENTS.some(d => devNameLower.includes(d))) {
    // Todo este bloco de roteamento para ai-vendas será removido
    // ...
  }
  // O restante (Helena processando outros empreendimentos) permanece
}
```

**Depois da remoção:** O bloco `if (developmentLead || mentionedDevelopment)` que processa empreendimentos com Helena permanece intacto.

### 2. Atualizar ai-vendas para Lovable AI Gateway

**Arquivo:** `supabase/functions/ai-vendas/index.ts`

O `ai-vendas` ainda usa a API OpenAI direta com `gpt-4o-mini`. Deve ser atualizado para usar o Lovable Gateway com `openai/gpt-5`.

**Alterações nas linhas 617-643:**

| Linha | Antes | Depois |
|-------|-------|--------|
| 617 | `const openaiKey = Deno.env.get('OPENAI_API_KEY');` | `const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');` |
| 619-620 | `if (!openaiKey) { throw new Error('OpenAI API key not configured'); }` | `if (!lovableApiKey) { throw new Error('Lovable AI API key not configured'); }` |
| 629 | `fetch('https://api.openai.com/v1/chat/completions'` | `fetch('https://ai.gateway.lovable.dev/v1/chat/completions'` |
| 632 | `'Authorization': \`Bearer ${openaiKey}\`` | `'Authorization': \`Bearer ${lovableApiKey}\`` |
| 636 | `model: 'gpt-4o-mini',` | `model: 'openai/gpt-5',` |

---

## Resumo das Alterações

| Arquivo | Alteração | Linhas |
|---------|-----------|--------|
| `make-webhook/index.ts` | Remover bloco de roteamento para ai-vendas | 3155-3212 |
| `ai-vendas/index.ts` | Migrar para Lovable AI Gateway (GPT-5) | 617-643 |

---

## Resultado Esperado

1. **Make.com nunca mais receberá `result: null`** - O bloco incorreto será removido
2. **Isolamento total dos canais** - Nenhuma "cross-talk" entre API Oficial e Make
3. **ai-vendas atualizado** - Usará GPT-5 via Lovable Gateway para melhor qualidade de resposta
