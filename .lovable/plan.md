

# Plano: Atualizar Edge Functions para OpenAI GPT-5

## Resumo

Este plano irá atualizar todas as Edge Functions que usam o Lovable AI Gateway para utilizar o modelo **openai/gpt-5** em vez de `google/gemini-2.5-flash`.

---

## Edge Functions a Atualizar

| Função | Arquivo | Ocorrências | Uso |
|--------|---------|-------------|-----|
| **ai-communicator** | `supabase/functions/ai-communicator/index.ts` | 2 | Chat inteligente e insights |
| **ai-virtual-agent** | `supabase/functions/ai-virtual-agent/index.ts` | 1 | Agente virtual de vendas (Aimee/Helena) |
| **ai-assistant** | `supabase/functions/ai-assistant/index.ts` | 1 | Assistente de análise de contexto |
| **simulate-portal-lead** | `supabase/functions/simulate-portal-lead/index.ts` | 1 | Simulador de leads de portal |

**Total:** 5 ocorrências em 4 arquivos

---

## Alterações por Arquivo

### 1. `ai-communicator/index.ts`

**Linha 214:**
```typescript
// ANTES
model: 'google/gemini-2.5-flash',

// DEPOIS
model: 'openai/gpt-5',
```

**Linha 638:**
```typescript
// ANTES
model: 'google/gemini-2.5-flash',

// DEPOIS
model: 'openai/gpt-5',
```

### 2. `ai-virtual-agent/index.ts`

**Linha 1575:**
```typescript
// ANTES
model: config.ai_model || 'google/gemini-2.5-flash',

// DEPOIS
model: config.ai_model || 'openai/gpt-5',
```

### 3. `ai-assistant/index.ts`

**Linha 138:**
```typescript
// ANTES
model: 'google/gemini-2.5-flash',

// DEPOIS
model: 'openai/gpt-5',
```

### 4. `simulate-portal-lead/index.ts`

**Linha 131:**
```typescript
// ANTES
model: "google/gemini-2.5-flash",

// DEPOIS
model: "openai/gpt-5",
```

---

## Benefícios do GPT-5

| Aspecto | Gemini 2.5 Flash | OpenAI GPT-5 |
|---------|------------------|--------------|
| **Raciocínio** | Bom | Excelente |
| **Contexto longo** | Muito bom | Excelente |
| **Multimodal** | Sim | Sim |
| **Nuance/Precisão** | Bom | Melhor |
| **Custo** | Menor | Maior |
| **Latência** | Mais rápido | Ligeiramente mais lento |

---

## Considerações

1. **Custo**: O GPT-5 é mais caro que o Gemini Flash. Monitore o uso de créditos no Lovable.

2. **Latência**: Pode haver um pequeno aumento no tempo de resposta (geralmente imperceptível para o usuário).

3. **Compatibilidade**: O Lovable AI Gateway suporta totalmente o GPT-5, então não há mudanças de API necessárias.

4. **Fallback configurável**: A função `ai-virtual-agent` usa `config.ai_model` como preferência, permitindo configuração via banco de dados. O novo default será GPT-5, mas administradores podem sobrescrever.

---

## Resumo de Alterações

| Arquivo | Linhas Alteradas |
|---------|------------------|
| `ai-communicator/index.ts` | 214, 638 |
| `ai-virtual-agent/index.ts` | 1575 |
| `ai-assistant/index.ts` | 138 |
| `simulate-portal-lead/index.ts` | 131 |

**Total de edições:** 5 substituições simples de string

