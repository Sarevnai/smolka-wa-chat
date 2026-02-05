

# Plano de Padronização: Aimee - Nome do Produto

## Conceito de Naming

| Nível | Nome | Descrição |
|-------|------|-----------|
| **Produto** | Aimee | Nome comercial da plataforma de IA |
| **Agentes por Departamento** | Aimee de [Departamento] | Aimee de Locação, Aimee de Vendas, Aimee Administrativa, Aimee de Marketing |
| **Instância do Cliente** | Helena Smolka | Nome personalizado que o cliente Smolka escolheu para seu agente |

---

## Inventário de Referências Encontradas

### Edge Functions (código)

| Arquivo | Linha(s) | Referência Atual | Ação |
|---------|----------|------------------|------|
| `ai-arya-vendas/index.ts` | 65-69 | `Você é a Helena, assistente de atendimento da Smolka` (prompt) | ✅ OK - Lê do banco |
| `ai-arya-vendas/index.ts` | 680 | `console.log('🏗️ Arya Vendas - Phone...')` | ❌ Alterar para `Aimee Vendas` |
| `ai-arya-vendas/index.ts` | 749 | `action_type: 'ai_arya_redirect_out_of_scope'` | ❌ Alterar para `ai_vendas_redirect_out_of_scope` |
| `ai-arya-vendas/index.ts` | 778 | `setting_category: 'ai_arya'` | ❌ Alterar para `ai_vendas` |
| `ai-arya-vendas/index.ts` | 899 | `action_type: 'ai_arya_vendas_welcome'` | ❌ Alterar para `ai_vendas_welcome` |
| `ai-arya-vendas/index.ts` | 1037 | `action_type: 'ai_arya_vendas'` | ❌ Alterar para `ai_vendas` |
| `ai-arya-vendas/index.ts` | 1067 | `console.error('❌ Error in ai-arya-vendas:')` | ❌ Alterar para `ai-vendas` |
| `whatsapp-webhook/index.ts` | 453 | `Used to route to ai-arya-vendas (Arya Vendas for empreendimentos)` | ❌ Alterar comentário |
| `whatsapp-webhook/index.ts` | 1192 | `(Arya Vendas)` em comentário | ❌ Alterar comentário |
| `whatsapp-webhook/index.ts` | 1304 | `Arya Vendas handled it` comentário | ❌ Alterar comentário |
| `whatsapp-webhook/index.ts` | 1474 | `for Arya's triage` comentário | ❌ Alterar comentário |
| `make-webhook/index.ts` | 3195-3197 | `routed_to: 'ai-arya-vendas'` e `Arya already sent` comentário | ❌ Alterar comentário |
| `simulate-portal-lead/index.ts` | 339 | `(what Nina would send)` comentário | ❌ Alterar para `Aimee` |

### Interface React (UI)

| Arquivo | Linha(s) | Referência Atual | Ação |
|---------|----------|------------------|------|
| `DevelopmentsManagement.tsx` | 106-107 | `para atendimento da Arya (Vendas)` | ❌ Alterar para `Aimee de Vendas` |
| `DevelopmentsManagement.tsx` | 121-122 | `para a Arya atender leads` | ❌ Alterar para `Aimee de Vendas` |
| `PortalLeadSimulator.tsx` | 183 | `Chamando IA Nina (modo simulação)` | ❌ Alterar para `Aimee` |
| `PortalLeadSimulator.tsx` | 186 | `Testando Nina com lead REAL` | ❌ Alterar para `Aimee` |
| `PortalLeadSimulator.tsx` | 214 | `Exibindo respostas da Nina` | ❌ Alterar para `Aimee` |
| `PortalLeadSimulator.tsx` | 249 | `próximo passo da Nina` | ❌ Alterar para `Aimee` |
| `PortalLeadSimulator.tsx` | 468 | `Arya busca imóveis similares` | ❌ Alterar para `Aimee de Vendas` |
| `PortalLeadSimulator.tsx` | 556-557 | `como a Arya responde` | ❌ Alterar para `Aimee` |
| `PortalLeadSimulator.tsx` | 688 | `Testar IA Arya` (botão) | ❌ Alterar para `Testar Aimee` |

### Banco de Dados (system_settings)

| Tabela | Registro | Valor Atual | Ação |
|--------|----------|-------------|------|
| `system_settings` | `setting_category: 'ai_arya'` | `quick_transfer_mode` | ❌ Alterar categoria para `ai_vendas` |

### Migrações Históricas (não alterar)

Os arquivos em `supabase/migrations/` são históricos e não devem ser modificados:
- `20260115134155_...sql` - Criou configurações com `Nina`
- `20260115191109_...sql` - Alterou para `Arya`
- `20260122175523_...sql` - Referência a `ai_arya` em setting_category
- `20260122235218_...sql` - Renomeou para `Helena`

---

## Arquivos a Modificar

### Fase 1: Edge Functions (6 arquivos)

1. **`supabase/functions/ai-arya-vendas/index.ts`**
   - Logs: `Arya Vendas` → `Aimee Vendas`
   - `action_type`: `ai_arya_*` → `ai_vendas_*`
   - `setting_category`: `ai_arya` → `ai_vendas`

2. **`supabase/functions/whatsapp-webhook/index.ts`**
   - Comentários: remover referências a `Arya`

3. **`supabase/functions/make-webhook/index.ts`**
   - Comentários: `Arya already sent` → `Aimee Vendas already sent`

4. **`supabase/functions/simulate-portal-lead/index.ts`**
   - Comentário: `what Nina would send` → `what Aimee would send`

### Fase 2: Interface React (2 arquivos)

1. **`src/pages/admin/DevelopmentsManagement.tsx`**
   - Textos: `Arya (Vendas)` → `Aimee de Vendas`

2. **`src/components/portal/PortalLeadSimulator.tsx`**
   - Textos: `Nina`/`Arya` → `Aimee`

### Fase 3: Migração do Banco de Dados

Nova migração SQL para:
```sql
-- Atualizar setting_category de ai_arya para ai_vendas
UPDATE system_settings 
SET setting_category = 'ai_vendas'
WHERE setting_category = 'ai_arya';
```

---

## Padrão de Nomenclatura Final

### Logs e Activity Types

| Antes | Depois |
|-------|--------|
| `ai_arya_vendas` | `ai_vendas` |
| `ai_arya_vendas_welcome` | `ai_vendas_welcome` |
| `ai_arya_redirect_out_of_scope` | `ai_vendas_redirect` |

### Setting Categories

| Antes | Depois |
|-------|--------|
| `ai_arya` | `ai_vendas` |

### Console Logs (desenvolvimento)

| Antes | Depois |
|-------|--------|
| `🏗️ Arya Vendas - Phone:` | `🏗️ Aimee Vendas - Phone:` |
| `❌ Error in ai-arya-vendas:` | `❌ Error in ai-vendas:` |

### UI (português para usuários)

| Contexto | Texto |
|----------|-------|
| Genérico | "Aimee" |
| Locação | "Aimee de Locação" |
| Vendas | "Aimee de Vendas" |
| Administrativo | "Aimee Administrativa" |
| Marketing | "Aimee de Marketing" |

---

## Impacto e Riscos

### Baixo Risco
- Alterações em comentários e logs (não afetam funcionalidade)
- Alterações em textos de UI

### Médio Risco
- Alteração de `action_type` nos activity_logs
  - **Mitigação**: Os logs antigos continuam funcionando, apenas novos logs usarão o novo padrão

### Alto Risco
- Alteração de `setting_category` no banco
  - **Mitigação**: A migração atualiza atomicamente, e o código é atualizado junto

---

## Arquivos que NÃO serão alterados

| Arquivo | Motivo |
|---------|--------|
| `supabase/functions/ai-arya-vendas/` (nome da pasta) | Renomear Edge Function requer delete + recreate, impacta referências em outros arquivos |
| Migrações históricas | São registros imutáveis do histórico do banco |

### Consideração sobre renomear a pasta `ai-arya-vendas`

Para renomear a pasta da Edge Function de `ai-arya-vendas` para `ai-vendas` seria necessário:
1. Criar nova edge function `ai-vendas`
2. Atualizar todas as referências em `whatsapp-webhook`, `make-webhook`, `landing-page-webhook`, `portal-leads-webhook`
3. Deletar a antiga `ai-arya-vendas`

**Recomendação**: Fazer isso em uma fase separada para minimizar riscos.

---

## Resumo das Alterações

| Categoria | Arquivos | Alterações |
|-----------|----------|------------|
| Edge Functions | 4 | Logs, action_types, comentários |
| Interface React | 2 | Textos visíveis ao usuário |
| Banco de Dados | 1 nova migração | setting_category |
| **Total** | **7 arquivos** | ~30 alterações de texto |

