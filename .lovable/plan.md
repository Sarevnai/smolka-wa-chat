
# Análise de Redundância na Configuração da IA

## Diagnóstico: 3 Fontes de Dados que Conflitam

Após analisar o sistema, identifiquei que existem **3 tabelas/configurações diferentes** que armazenam dados similares, causando confusão e potenciais conflitos:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FONTES DE CONFIGURAÇÃO                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. system_settings.ai_agent_config     (Configuração Global)               │
│     └─ Usada pelo backend (make-webhook, ai-virtual-agent)                  │
│     └─ ~50 campos configuráveis                                             │
│                                                                             │
│  2. ai_department_configs               (Configuração por Setor)            │
│     └─ NÃO usada pelo backend atualmente                                    │
│     └─ Campos duplicados: agent_name, tone, services, faqs, etc.            │
│                                                                             │
│  3. ai_behavior_config                  (Funções e Perguntas)               │
│     └─ Usada pelo backend                                                   │
│     └─ Campos únicos: essential_questions, functions                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mapa de Redundâncias por Aba da UI

| Aba UI | Tabela Usada | Status | Problema |
|--------|--------------|--------|----------|
| **Identidade** | `ai_agent_config` | Ativo no backend | OK - é a fonte principal |
| **Comportamento** | `ai_behavior_config` | Ativo no backend | OK - campos únicos |
| **Vendas** | `ai_agent_config` | Ativo no backend | OK - rapport, triggers |
| **SPIN** | `ai_agent_config` | Ativo no backend | OK - mas pouco útil |
| **Provedor** | `ai_agent_config` | Ativo no backend | OK - modelo, tokens |
| **Áudio** | `ai_agent_config` | Ativo no backend | OK - ElevenLabs |
| **Perfis** | `ai_department_configs` | NÃO USADO | REDUNDANTE |
| **Prompt** | `ai_agent_config` | Ativo no backend | ESSENCIAL |

---

## Campos Duplicados Encontrados

```text
ai_agent_config             ai_department_configs     CONFLITO?
─────────────────────────────────────────────────────────────────
agent_name: "Helena"        agent_name: "Helena Loc"   SIM
tone: "friendly"            tone: "friendly"           SIM
services: [...]             services: [...]            SIM
greeting_message: "..."     greeting_message: "..."    SIM
custom_instructions: "..."  custom_instructions: "..." SIM
faqs: [...]                 faqs: [...]                SIM
limitations: [...]          limitations: [...]         SIM
                            qualification_focus: []    ÚNICO
```

---

## O que Está Ativo no Backend

Analisando as Edge Functions (`make-webhook`, `ai-virtual-agent`):

**USADO:**
- `ai_agent_config` → Prompt, tom, nome, gatilhos, rapport, áudio, etc.
- `ai_behavior_config` → Perguntas essenciais, funções (visita, reengajamento)
- `prompt_overrides` → Override manual de prompt por departamento

**NÃO USADO:**
- `ai_department_configs` → Tabela existe mas o backend não lê dela

---

## Recomendação: Simplificar para 2 Fontes

### Estrutura Proposta

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NOVA ESTRUTURA (2 tabelas)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. ai_agent_config (system_settings)                                       │
│     └─ Identidade global                                                    │
│     └─ Provedor e Áudio                                                     │
│     └─ Vendas (rapport, gatilhos, objeções)                                 │
│     └─ Prompt overrides por departamento                                    │
│                                                                             │
│  2. ai_behavior_config                                                      │
│     └─ Perguntas essenciais de qualificação                                 │
│     └─ Funções (agendamento, reengajamento, etc.)                           │
│                                                                             │
│  [REMOVER] ai_department_configs → Não usado, causa confusão                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Plano de Ação: Consolidar as Abas

### Abas a MANTER (4)
1. **Identidade** - Nome, empresa, tom, serviços, FAQs
2. **Comportamento** - Perguntas essenciais + funções (atual)
3. **Técnico** - Provedor, áudio, humanização (combinar 3 abas)
4. **Prompt** - Override manual por departamento

### Abas a REMOVER (4)
1. **Vendas** → Mover rapport/gatilhos para "Identidade" (seção avançada)
2. **SPIN** → Não usado de verdade, perguntas já estão em "Comportamento"
3. **Perfis** → Tabela não usada pelo backend, gera confusão
4. **Áudio** → Combinar com "Técnico"

---

## Detalhamento Técnico

### Passo 1: Remover Aba "Perfis"
- A tabela `ai_department_configs` não é lida pelo backend
- Usuário configura mas não tem efeito real
- Ação: Remover aba da UI

### Passo 2: Remover Aba "SPIN"
- As perguntas SPIN não são usadas no fluxo real
- O backend usa `essential_questions` de `ai_behavior_config`
- As perguntas SPIN são genéricas demais para imobiliária
- Ação: Remover aba da UI

### Passo 3: Combinar "Provedor" + "Áudio" em "Técnico"
- São configurações técnicas relacionadas
- Reduz número de abas

### Passo 4: Mover "Vendas" para Seção Avançada
- Rapport e gatilhos são opcionais
- Podem ficar como accordion em "Identidade"

### Estrutura Final da UI

```text
AIUnifiedConfig (4 abas)
├── Identidade
│   ├── Nome e Tom
│   ├── Empresa e Serviços
│   ├── FAQs e Limitações
│   └── [Avançado: Rapport e Gatilhos]
│
├── Comportamento
│   ├── Perguntas Essenciais
│   └── Funções da IA
│
├── Técnico
│   ├── Provedor (OpenAI/Lovable)
│   ├── Modelo e Tokens
│   ├── Humanização
│   └── Áudio (ElevenLabs)
│
└── Prompt
    ├── Preview por Departamento
    ├── Instruções Personalizadas
    └── Override Completo
```

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/admin/AIUnifiedConfig.tsx` | Remover abas, reorganizar |
| `src/components/ai-config/AIProfilesTab.tsx` | Deletar |
| `src/components/ai-config/AIQualificationTab.tsx` | Deletar |
| `src/components/ai-config/AISalesTab.tsx` | Mover conteúdo para AIIdentityTab |
| `src/components/ai-config/AIAudioTab.tsx` | Combinar com novo AITechnicalTab |
| `src/components/ai-config/AIProviderTab.tsx` | Combinar com novo AITechnicalTab |
| `src/components/ai-config/index.ts` | Atualizar exports |
| `src/hooks/useAIDepartmentConfig.ts` | Pode ser removido (não usado) |

---

## Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Abas de configuração | 8 | 4 |
| Tabelas de config | 3 | 2 |
| Campos redundantes | ~15 | 0 |
| Confusão do usuário | Alta | Baixa |
