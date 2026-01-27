
# Análise Completa: Nomes das IAs e Frentes de Atendimento

## Fase 1: Estado Atual dos Nomes

### Mapeamento de Nomes Encontrados

| Local | Nome Atual | Contexto |
|-------|-----------|----------|
| `ai-arya-vendas/index.ts` | Helena | Consultora de vendas para empreendimentos |
| `ai-marketing-agent/index.ts` | Helena | Assistente para campanhas de atualização |
| `ai-virtual-agent/index.ts` | **Arya** (hardcoded fallback) | Triagem e atendimento geral |
| `system_settings.ai_agent_config` | Helena Smolka | Configuração global |
| `ai_department_configs` | Helena Locação, Helena Vendas, Helena Admin, Helena Marketing | Por departamento |
| UI Sidebar | **Minha Aimee** | Menu de configuração |
| WhatsApp Profile Page | **Perfil da sua Aimee** | Página de configuração |
| Breadcrumbs | **Minha IA** | Navegação |

### Arquivos a Corrigir (Fase 1)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     BACKEND - EDGE FUNCTIONS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  supabase/functions/ai-virtual-agent/index.ts                               │
│  ├─ Linha 859: "Arya da Smolka" → usar config.agent_name                   │
│  ├─ Linha 1825: fallback "Arya" → remover ou usar "Assistente"             │
│  ├─ Linha 2208: fallback "Arya" → remover ou usar "Assistente"             │
│  └─ Linha 2907-2908: hardcoded "Arya da Smolka" → usar config              │
│                                                                             │
│  supabase/functions/whatsapp-webhook/index.ts                               │
│  └─ Linha 1341: Log "Nina" → atualizar para consistência                   │
│                                                                             │
│  supabase/functions/make-webhook/index.ts                                   │
│  └─ Linha 842-843: Referência "Helena" está correta                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          FRONTEND - UI                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  src/components/AppSidebar.tsx                                              │
│  └─ Linha 240: "Minha Aimee" → Manter (nome do produto)                    │
│                                                                             │
│  src/pages/admin/WhatsAppProfileSettings.tsx                                │
│  └─ Linha 159: "Perfil da sua Aimee" → Manter (nome do produto)            │
│                                                                             │
│  src/pages/admin/AIUnifiedConfig.tsx                                        │
│  └─ Linha 51: "Minha IA" → Manter (genérico)                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Estratégia de Nomes

| Contexto | Nome a Usar | Justificativa |
|----------|-------------|---------------|
| **Produto (UI, Marketing)** | Aimee | Nome comercial da plataforma |
| **Agente cliente Smolka** | Helena Smolka | Configuração específica do cliente |
| **Fallback no código** | `config.agent_name` | Sempre usar configuração dinâmica |
| **Logs de debug** | Nome genérico (ex: "agent", "AI") | Não hardcodar nomes |

---

## Fase 2: Análise das Duas Frentes

### Arquitetura Atual

```text
                    ┌─────────────────────────────────────────┐
                    │         MENSAGEM RECEBIDA               │
                    └─────────────────────┬───────────────────┘
                                          │
              ┌───────────────────────────┴───────────────────────────┐
              │                                                       │
              ▼                                                       ▼
    ┌─────────────────────────┐                           ┌─────────────────────────┐
    │   whatsapp-webhook      │                           │     make-webhook        │
    │   (API META Direta)     │                           │   (via Make.com)        │
    └────────────┬────────────┘                           └────────────┬────────────┘
                 │                                                     │
    ┌────────────┴────────────────────────────────┐                   │
    │                PRIORIDADE                    │                   │
    │                                              │                   │
    ▼                                              ▼                   ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐
│   P0: Vendas│   │ P1: Marketing│  │ P2: Geral   │   │  Default: Vendas            │
│(empreendim.)│   │ (campanhas)  │  │ (triagem)   │   │  ou detecta empreendimento  │
└──────┬──────┘   └──────┬───────┘  └──────┬──────┘   └──────────────┬──────────────┘
       │                 │                 │                         │
       ▼                 ▼                 ▼                         ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐
│ai-arya-vendas│  │ai-marketing │   │ai-virtual   │   │     make-webhook            │
│  (Helena)   │   │   -agent    │   │   -agent    │   │   (lógica interna)          │
│             │   │  (Helena)   │   │  (Arya←bug) │   └──────────────┬──────────────┘
└─────────────┘   └─────────────┘   └─────────────┘                  │
                                                                     │
                                                     ┌───────────────┴───────────────┐
                                                     │  Detecta Empreendimento?      │
                                                     └───────────────┬───────────────┘
                                                            ┌────────┴────────┐
                                                            │ SIM            │ NÃO
                                                            ▼                ▼
                                                    ┌─────────────┐  ┌─────────────┐
                                                    │ ai-arya-    │  │ Nina Geral  │
                                                    │ vendas      │  │ (OpenAI)    │
                                                    └─────────────┘  └─────────────┘
```

### Verificação das Duas Frentes

#### ✅ Frente 1: Aimee de Atendimento (ai-virtual-agent)

| Função | Status | Implementação |
|--------|--------|---------------|
| **Triagem** | ✅ Implementada | Template `triagem_ia` com botões: Alugar, Comprar, Já sou cliente |
| **Locação** | ✅ Implementada | Após triagem, department_code = 'locacao' → busca imóveis via Vista |
| **Administrativo** | ✅ Implementada | department_code = 'administrativo' → atende clientes existentes |

**Fluxo de Triagem:**
1. `greeting` → Envia saudação com nome da IA
2. `awaiting_name` → Coleta nome do cliente
3. `awaiting_preference` → Pergunta texto/áudio
4. `awaiting_triage` → Envia template com botões
5. Ao clicar → `assignDepartmentToConversation()` → direciona

#### ✅ Frente 2: Aimee de Marketing (ai-marketing-agent + ai-arya-vendas)

| Função | Status | Agente | Trigger |
|--------|--------|--------|---------|
| **Campanhas de Atualização** | ✅ | ai-marketing-agent | Resposta a campanha (48h) ou department_code='marketing' |
| **Leads de Empreendimentos** | ✅ | ai-arya-vendas | portal_leads_log com development_id |

**Lógica de Roteamento (whatsapp-webhook):**
```typescript
// Prioridade 0: Empreendimento (Helena Vendas)
if (developmentLead) → ai-arya-vendas

// Prioridade 1: Campanha Marketing (Helena Marketing)
if (marketingCampaign || department_code === 'marketing') → ai-marketing-agent

// Prioridade 2: Atendimento Geral (Helena Atendimento)
else → ai-virtual-agent
```

---

## Discrepâncias Encontradas

### 1. Nome Inconsistente no ai-virtual-agent
O `ai-virtual-agent` tem fallback hardcoded para "Arya" em vez de usar `config.agent_name`:

```typescript
// Linha 2208 - PROBLEMA
const greetingText = `Olá! Aqui é a ${config.agent_name || 'Arya'} da ${config.company_name || 'Smolka Imóveis'} 🏠`;
```

**Correção:** Remover fallback específico ou usar "Assistente Virtual"

### 2. Logs com Nomes Antigos
```typescript
// whatsapp-webhook linha 1341
console.log(`📢 Routing to ai-marketing-agent (Nina)`);
```

**Correção:** Remover referência a "Nina"

### 3. Prompt de Exemplo com Nome Antigo
```typescript
// ai-virtual-agent linha 859
AGENTE: Oi! Aqui é a Arya da Smolka 🏠
```

**Correção:** Substituir por placeholder dinâmico

---

## Plano de Implementação

### Fase 1: Unificação de Nomes

| # | Arquivo | Alteração |
|---|---------|-----------|
| 1 | `ai-virtual-agent/index.ts` | Substituir todos os fallbacks "Arya" por `config.agent_name` ou valor genérico |
| 2 | `ai-virtual-agent/index.ts` | Atualizar exemplo de conversa no prompt (linha 859) |
| 3 | `whatsapp-webhook/index.ts` | Remover "(Nina)" dos logs |
| 4 | `make-webhook/index.ts` | Verificar e garantir uso de config.agent_name |

### Fase 2: Validação das Frentes

| # | Verificação | Status |
|---|-------------|--------|
| 1 | Triagem via template `triagem_ia` | ✅ Funcionando |
| 2 | Atendimento Locação | ✅ Funcionando |
| 3 | Atendimento Administrativo | ✅ Funcionando |
| 4 | Leads de Campanha → ai-marketing-agent | ✅ Funcionando |
| 5 | Leads de Empreendimento → ai-arya-vendas | ✅ Funcionando |

---

## Resumo Executivo

### Nomes a Eliminar
- ❌ **Arya** - Remover completamente (hardcoded em ai-virtual-agent)
- ❌ **Nina** - Remover de logs e comentários

### Nomes a Manter
- ✅ **Aimee** - Nome do produto na UI
- ✅ **Helena** - Nome configurado para cliente Smolka (via ai_agent_config)
- ✅ **config.agent_name** - Sempre usar referência dinâmica

### Duas Frentes - Confirmação

| Frente | Edge Function | Funções |
|--------|---------------|---------|
| **Atendimento** | ai-virtual-agent | Triagem, Locação, Administrativo |
| **Marketing** | ai-marketing-agent + ai-arya-vendas | Campanhas de atualização, Leads de empreendimentos |

Ambas as frentes estão implementadas e funcionando. A única pendência é a correção dos nomes hardcoded no código.
