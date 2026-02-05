# Plano de Padronização: Aimee - Nome do Produto

## ✅ Status: CONCLUÍDO

**Implementado em:** 2026-02-05

---

## Conceito de Naming

| Nível | Nome | Descrição |
|-------|------|-----------|
| **Produto** | Aimee | Nome comercial da plataforma de IA |
| **Agentes por Departamento** | Aimee de [Departamento] | Aimee de Locação, Aimee de Vendas, Aimee Administrativa, Aimee de Marketing |
| **Instância do Cliente** | Helena Smolka | Nome personalizado que o cliente Smolka escolheu para seu agente |

---

## ✅ Alterações Realizadas

### Edge Functions

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `ai-arya-vendas/index.ts` | Logs: `Aimee Vendas` | ✅ |
| `ai-arya-vendas/index.ts` | `action_type`: `ai_vendas_*` | ✅ |
| `ai-arya-vendas/index.ts` | `setting_category`: `ai_vendas` | ✅ |
| `whatsapp-webhook/index.ts` | Comentários atualizados | ✅ |
| `make-webhook/index.ts` | Comentário atualizado | ✅ |
| `simulate-portal-lead/index.ts` | Comentário atualizado | ✅ |

### Interface React

| Arquivo | Alteração | Status |
|---------|-----------|--------|
| `DevelopmentsManagement.tsx` | Textos: `Aimee de Vendas` | ✅ |
| `PortalLeadSimulator.tsx` | Textos: `Aimee` | ✅ |

### Banco de Dados

| Migração | Status |
|----------|--------|
| `setting_category: ai_arya → ai_vendas` | ⏳ Aguardando aprovação |

---

## Padrão Final

| Contexto | Texto |
|----------|-------|
| Genérico | "Aimee" |
| Locação | "Aimee de Locação" |
| Vendas | "Aimee de Vendas" |
| Administrativo | "Aimee Administrativa" |
| Marketing | "Aimee de Marketing" |

---

## Arquivos NÃO alterados (por design)

| Arquivo | Motivo |
|---------|--------|
| `supabase/functions/ai-arya-vendas/` (nome da pasta) | Renomear Edge Function requer delete + recreate em fase separada |
| Migrações históricas | São registros imutáveis do histórico do banco |

