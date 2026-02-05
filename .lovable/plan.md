
# Plano Completo de Padronização Aimee - 3 Fases

## Análise do Estado Atual

### Já Implementado (Fase Anterior)
- ✅ `action_type` nos logs alterados de `ai_arya_*` para `ai_vendas_*`
- ✅ `setting_category` alterado de `ai_arya` para `ai_vendas`
- ✅ Textos de UI atualizados para "Aimee"
- ✅ Migração `setting_category` executada

### Pendências Identificadas

| Item | Localização | Tipo | Risco |
|------|-------------|------|-------|
| Comentários com "Nina" | `whatsapp-webhook/index.ts` linhas 555, 652, 1091 | Comentário | Baixo |
| Variáveis `aryaResult`, `aryaError` | `whatsapp-webhook/index.ts` linhas 1271-1287 | Código | **Médio** |
| Variáveis `aryaResult`, `aryaError` | `make-webhook/index.ts` linhas 3166-3202 | Código | **Médio** |
| Logs com "ai-arya-vendas" | `whatsapp-webhook/index.ts`, `make-webhook/index.ts` | Log | Baixo |
| Descrição "Arya" no banco | `system_settings.quick_transfer_mode` | Banco | Baixo |
| Nome pasta `ai-arya-vendas` | `supabase/functions/` | Estrutural | **ALTO** |
| Config `[functions.ai-arya-vendas]` | `supabase/config.toml` | Config | **ALTO** |
| Invocações `ai-arya-vendas` | 2 arquivos (whatsapp-webhook, make-webhook) | Código | **ALTO** |

---

## FASE 1: Limpeza de Comentários e Variáveis (Risco: Baixo/Médio)

### Arquivos a modificar

**1. `supabase/functions/whatsapp-webhook/index.ts`**

| Linha | Atual | Novo |
|-------|-------|------|
| 453 | `Used to route to ai-arya-vendas (Aimee de Vendas for empreendimentos)` | `Used to route to Aimee de Vendas (for empreendimentos)` |
| 555-556 | `pending triage by Nina` | `pending triage by Aimee` |
| 652-653 | `Assign department to conversation after Nina's triage` | `Assign department to conversation after Aimee's triage` |
| 1091 | `Desativado para permitir que a Nina responda diretamente` | `Desativado para permitir que a Aimee responda diretamente` |
| 1264-1284 | `aryaResult`, `aryaError`, logs com `ai-arya-vendas` | `vendasResult`, `vendasError`, logs com `Aimee Vendas` |

**2. `supabase/functions/make-webhook/index.ts`**

| Linha | Atual | Novo |
|-------|-------|------|
| 3162 | `Routing ... to ai-arya-vendas` | `Routing ... to Aimee Vendas` |
| 3166-3202 | `aryaResult`, `aryaError`, logs `ai-arya-vendas` | `vendasResult`, `vendasError`, logs `Aimee Vendas` |

### Análise de Risco - Fase 1
- **Risco de quebra**: BAIXO
- **Motivo**: Renomear variáveis locais (`aryaResult` → `vendasResult`) não afeta funcionalidade, são escopos locais
- **Validação**: As invocações `supabase.functions.invoke('ai-arya-vendas')` continuam funcionando (nome da função não muda ainda)

---

## FASE 2: Atualização da Descrição no Banco de Dados (Risco: Baixo)

### Migração SQL

```sql
-- Atualizar descrição do quick_transfer_mode para usar Aimee
UPDATE system_settings 
SET description = 'Quando ativo, a Aimee de Vendas apenas confirma interesse e encaminha para C2S sem responder perguntas técnicas'
WHERE setting_key = 'quick_transfer_mode'
  AND description ILIKE '%Arya%';
```

### Análise de Risco - Fase 2
- **Risco de quebra**: NENHUM
- **Motivo**: Campo `description` é apenas descritivo, não afeta lógica
- **Validação**: Nenhum código lê este campo para tomar decisões

---

## FASE 3: Renomear Edge Function (Risco: ALTO - ATENÇÃO ESPECIAL)

### ⚠️ ALERTA DE RISCO

Esta fase requer atenção especial pois envolve:
1. **Deletar** a função antiga `ai-arya-vendas`
2. **Criar** a nova função `ai-vendas`
3. **Atualizar** TODAS as referências em outros arquivos
4. **Atualizar** `supabase/config.toml`

### Pontos de Atenção

| Risco | Descrição | Mitigação |
|-------|-----------|-----------|
| **Downtime** | Entre delete e deploy da nova, leads não serão processados | Executar rapidamente em sequência |
| **Referências quebradas** | Se esquecer de atualizar algum invoke | Verificar TODOS os arquivos antes |
| **Cache** | Supabase pode cachear nomes de funções | Aguardar propagação |

### Passos Detalhados

**Passo 1: Criar nova Edge Function `ai-vendas`**
- Copiar INTEIRO conteúdo de `ai-arya-vendas/index.ts` para `ai-vendas/index.ts`
- Criar pasta `supabase/functions/ai-vendas/`

**Passo 2: Atualizar `supabase/config.toml`**
```toml
# ANTES
[functions.ai-arya-vendas]
verify_jwt = false

# DEPOIS
[functions.ai-vendas]
verify_jwt = false
```

**Passo 3: Atualizar invocações em `whatsapp-webhook/index.ts`**
```typescript
// ANTES (linha 1271)
await supabase.functions.invoke('ai-arya-vendas', { ... })

// DEPOIS
await supabase.functions.invoke('ai-vendas', { ... })
```

**Passo 4: Atualizar invocações em `make-webhook/index.ts`**
```typescript
// ANTES (linha 3166)
await supabase.functions.invoke('ai-arya-vendas', { ... })

// DEPOIS
await supabase.functions.invoke('ai-vendas', { ... })
```

**Passo 5: Deletar pasta antiga**
- Remover `supabase/functions/ai-arya-vendas/`
- Chamar ferramenta `delete_edge_functions` com `['ai-arya-vendas']`

**Passo 6: Remover entrada antiga do config.toml**
- Garantir que `[functions.ai-arya-vendas]` foi removido

### Análise de Risco - Fase 3
- **Risco de quebra**: **ALTO durante transição**
- **Janela de risco**: ~30 segundos entre delete e deploy
- **Impacto se falhar**: Leads de empreendimentos não recebem resposta automática

### Recomendação para Fase 3

**OPÇÃO A (Mais Segura):** 
Deploy da nova função ANTES de remover a antiga:
1. Criar `ai-vendas` e deployar
2. Atualizar referências nos webhooks
3. Testar com lead de teste
4. Após confirmar funcionamento, deletar `ai-arya-vendas`

**OPÇÃO B (Mais Rápida):**
Executar todos os passos de uma vez no mesmo commit

**Recomendo OPÇÃO A** para minimizar riscos.

---

## Resumo das Fases

| Fase | Descrição | Arquivos | Risco | Impacto |
|------|-----------|----------|-------|---------|
| **1** | Limpar comentários e variáveis | 2 | Baixo | Nenhum |
| **2** | Atualizar descrição no banco | 0 (SQL) | Nenhum | Nenhum |
| **3** | Renomear Edge Function | 4 | **ALTO** | Potencial downtime |

---

## Ordem de Execução Recomendada

```text
┌──────────────────────────────────────────────────────────────────┐
│  FASE 1: Limpar comentários e variáveis                          │
│  ✓ whatsapp-webhook/index.ts                                     │
│  ✓ make-webhook/index.ts                                         │
│  → Deploy e verificar logs                                       │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  FASE 2: Atualizar descrição no banco                            │
│  ✓ Migração SQL para quick_transfer_mode                         │
│  → Verificar no dashboard                                        │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│  FASE 3: Renomear Edge Function (ATENÇÃO)                        │
│                                                                  │
│  Passo 3.1: Criar ai-vendas/index.ts                             │
│  Passo 3.2: Adicionar ao config.toml                             │
│  Passo 3.3: Deploy nova função                                   │
│  Passo 3.4: Atualizar invocações nos webhooks                    │
│  Passo 3.5: Deploy webhooks                                      │
│  Passo 3.6: Testar com lead real                                 │
│  Passo 3.7: Deletar ai-arya-vendas                               │
│  Passo 3.8: Remover do config.toml                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Checklist de Validação Pós-Implementação

| Verificação | Método | Critério de Sucesso |
|-------------|--------|---------------------|
| Logs sem "Arya" | Buscar nos arquivos | 0 resultados (exceto migrações históricas) |
| Logs sem "Nina" | Buscar nos arquivos | 0 resultados (exceto migrações históricas) |
| Banco sem "Arya" | Query `description` | 0 resultados |
| Edge Function nova funciona | Enviar lead de teste | Resposta recebida |
| Edge Function antiga deletada | Dashboard Supabase | Não aparece na lista |

---

## Seção Técnica: Detalhamento das Alterações

### Fase 1 - Código Específico

**whatsapp-webhook/index.ts - Comentários:**
- Linha 453: Atualizar docstring da função `checkDevelopmentLead`
- Linha 555-556: Comentário em `findOrCreateConversation`
- Linha 652-653: Docstring de `assignDepartmentToConversation`
- Linha 1091: Comentário do FlowBuilder desativado

**whatsapp-webhook/index.ts - Variáveis (linhas 1264-1304):**
```typescript
// ANTES
const { data: aryaResult, error: aryaError } = await supabase.functions.invoke('ai-arya-vendas', {...});
if (aryaError) { console.error('❌ Error calling ai-arya-vendas:', aryaError); }
console.log('✅ ai-arya-vendas response:', aryaResult);
if (aryaResult?.c2s_transferred) {...}

// DEPOIS
const { data: vendasResult, error: vendasError } = await supabase.functions.invoke('ai-arya-vendas', {...});
if (vendasError) { console.error('❌ Error calling Aimee Vendas:', vendasError); }
console.log('✅ Aimee Vendas response:', vendasResult);
if (vendasResult?.c2s_transferred) {...}
```

**make-webhook/index.ts - Variáveis (linhas 3162-3202):**
```typescript
// ANTES
console.log(`🔄 Routing ${devInfo.development_name} lead to ai-arya-vendas via internal call`);
const { data: aryaResult, error: aryaError } = await supabase.functions.invoke('ai-arya-vendas', {...});
if (aryaError) { console.error(`❌ ai-arya-vendas error:`, aryaError); }
console.log(`✅ ai-arya-vendas responded for ${devInfo.development_name}`);

// DEPOIS
console.log(`🔄 Routing ${devInfo.development_name} lead to Aimee Vendas via internal call`);
const { data: vendasResult, error: vendasError } = await supabase.functions.invoke('ai-arya-vendas', {...});
if (vendasError) { console.error(`❌ Aimee Vendas error:`, vendasError); }
console.log(`✅ Aimee Vendas responded for ${devInfo.development_name}`);
```

### Fase 3 - Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/ai-vendas/index.ts` | CRIAR (cópia de ai-arya-vendas) |
| `supabase/functions/ai-arya-vendas/` | DELETAR |
| `supabase/config.toml` | Substituir `ai-arya-vendas` por `ai-vendas` |
| `whatsapp-webhook/index.ts` | Alterar invoke de `ai-arya-vendas` para `ai-vendas` |
| `make-webhook/index.ts` | Alterar invoke de `ai-arya-vendas` para `ai-vendas` |

---

## Estimativa de Impacto

| Categoria | Quantidade |
|-----------|------------|
| Arquivos modificados | 4-5 |
| Linhas de código alteradas | ~50 |
| Migrações SQL | 1 |
| Edge Functions afetadas | 3 (criada 1, modificadas 2, deletada 1) |
| **Nível de mudança geral** | **75%** → **100% padronizado** |

---

## Decisão Necessária

Antes de prosseguir com a **Fase 3**, preciso saber:

**Você prefere a OPÇÃO A (mais segura, deploy nova antes de deletar antiga) ou OPÇÃO B (mais rápida, tudo de uma vez)?**

As Fases 1 e 2 podem ser executadas imediatamente sem riscos.
