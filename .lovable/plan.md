
# Plano: Visualização e Edição Completa do Prompt da IA

## Objetivo

Criar uma nova aba na página de configuração da IA (`AIUnifiedConfig`) que permite visualizar o prompt completo gerado para cada departamento e editar manualmente partes dele.

---

## Análise Técnica

### Arquitetura Atual do Prompt

O sistema constrói prompts dinamicamente através de funções builder:

| Função | Departamento | Localização |
|--------|--------------|-------------|
| `buildLocacaoPrompt()` | Locação | `make-webhook/index.ts` |
| `buildVendasPrompt()` | Vendas | `make-webhook/index.ts` |
| `buildAdminPrompt()` | Administrativo | `make-webhook/index.ts` |
| `buildVirtualAgentPrompt()` | Geral | `make-webhook/index.ts` |
| `buildQuickTransferPrompt()` | Empreendimentos | `make-webhook/index.ts` |
| `buildSystemPrompt()` | Virtual Agent | `ai-virtual-agent/index.ts` |

### Componentes do Prompt

O prompt atual é montado usando:

1. **Configurações dinâmicas** (já editáveis em `ai_agent_config`):
   - `agent_name`, `company_name`, `company_description`
   - `services[]`, `limitations[]`, `faqs[]`
   - `target_audience`, `competitive_advantages[]`
   - `custom_instructions` (texto livre)
   - Gatilhos mentais, rapport, objeções

2. **Estrutura fixa** (hardcoded nas funções):
   - Regras de fluxo (5 etapas)
   - Regras anti-loop
   - Instruções de busca de imóveis
   - Formato de respostas
   - Conhecimento de regiões

---

## Solução Proposta

### 1. Nova Aba "Prompt" na Configuração

Adicionar uma 8ª aba chamada **"Prompt"** em `AIUnifiedConfig`:

```
[Identidade] [Comportamento] [Vendas] [SPIN] [Provedor] [Áudio] [Perfis] [🆕 Prompt]
```

### 2. Estrutura do Componente

```text
┌─────────────────────────────────────────────────────────────────┐
│  Prompt Completo do Agente                                      │
├─────────────────────────────────────────────────────────────────┤
│  [Seletor de Departamento]  [Locação ▼] [Vendas] [Admin] [Geral]│
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  📋 Preview do Prompt (somente leitura)                  │   │
│  │                                                          │   │
│  │  🚨 REGRA ZERO: Você é Helena da Smolka Imóveis...      │   │
│  │  👤 CLIENTE: {nome}                                     │   │
│  │  📜 CONTEXTO: ...                                       │   │
│  │  ...                                                    │   │
│  │  [2.500 tokens]                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✏️ Instruções Personalizadas (editável)                 │   │
│  │  [Textarea grande com o campo custom_instructions]       │   │
│  │                                                          │   │
│  │  Este texto será adicionado ao final do prompt com o    │   │
│  │  cabeçalho "INSTRUÇÕES ESPECIAIS:"                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🔧 Override Completo (modo avançado)                    │   │
│  │  [Switch: Usar prompt customizado completo]              │   │
│  │                                                          │   │
│  │  [Textarea enorme - prompt completo editável]            │   │
│  │  ⚠️ Atenção: Este prompt substitui 100% do gerado       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│                                         [Copiar Prompt] [Salvar]│
└─────────────────────────────────────────────────────────────────┘
```

### 3. Funcionalidades

#### 3.1 Preview do Prompt (Somente Leitura)
- Gera o prompt completo usando as configurações atuais
- Mostra exatamente o que é enviado para a OpenAI
- Contagem de tokens (aproximada)
- Código colorido por seções

#### 3.2 Instruções Personalizadas (Já Existe)
- Destaque o campo `custom_instructions` já existente
- Explicar onde ele aparece no prompt

#### 3.3 Override Completo (Novo)
Novo campo `prompt_override` por departamento:

```typescript
prompt_overrides: {
  locacao: string | null;
  vendas: string | null;
  administrativo: string | null;
  geral: string | null;
}
```

Quando definido, substitui completamente o prompt gerado.

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/ai-config/AIPromptTab.tsx` | **Criar** | Novo componente da aba de prompt |
| `src/pages/admin/AIUnifiedConfig.tsx` | **Modificar** | Adicionar a 8ª aba |
| `src/hooks/useAIUnifiedConfig.ts` | **Modificar** | Adicionar campo `prompt_overrides` |
| `src/lib/promptBuilder.ts` | **Criar** | Funções para gerar preview do prompt no frontend |
| `supabase/functions/make-webhook/index.ts` | **Modificar** | Suportar `prompt_overrides` da config |

---

## Implementação Detalhada

### Fase 1: Frontend - Componente AIPromptTab

Criar `src/components/ai-config/AIPromptTab.tsx`:

- Seletor de departamento (tabs ou dropdown)
- Textarea com o preview do prompt gerado (readonly, com scroll)
- Textarea para `custom_instructions` (já existente, apenas destacar)
- Switch para modo "Override Completo"
- Textarea grande para prompt customizado
- Botão "Copiar Prompt"
- Botão "Salvar"
- Contador de tokens aproximado

### Fase 2: Gerador de Preview no Frontend

Criar `src/lib/promptBuilder.ts`:

- Função `buildPromptPreview(config, department)` que replica a lógica do backend
- Retorna o prompt completo como string
- Usado apenas para visualização no frontend

### Fase 3: Atualizar Hook e Interface

Modificar `src/hooks/useAIUnifiedConfig.ts`:

```typescript
interface AIAgentConfig {
  // ... campos existentes ...
  
  // Novo campo para override de prompts
  prompt_overrides: {
    locacao: string | null;
    vendas: string | null;
    administrativo: string | null;
    geral: string | null;
  };
}
```

### Fase 4: Atualizar Backend

Modificar `supabase/functions/make-webhook/index.ts`:

```typescript
// No início do processamento, verificar se existe override
if (agentConfig.prompt_overrides?.[currentDepartment]) {
  systemPrompt = agentConfig.prompt_overrides[currentDepartment];
} else {
  // usar prompt builder normal
  systemPrompt = buildLocacaoPrompt(...);
}
```

---

## UX e Design

### Alertas de Segurança

- Ao ativar "Override Completo": 
  > "⚠️ Modo avançado: Este prompt substituirá completamente o prompt gerado automaticamente. Certifique-se de incluir todas as instruções necessárias."

### Validação

- Mínimo 100 caracteres para override
- Máximo 32.000 caracteres (limite da OpenAI)
- Alerta se prompt muito grande (> 4.000 tokens)

### Código Colorido (Opcional)

Diferentes cores para seções:
- 🟢 Identidade (nome, empresa)
- 🔵 Regras e fluxos
- 🟡 Configurações dinâmicas
- 🟣 Custom instructions

---

## Resumo de Entregas

1. **Nova aba "Prompt"** na página de configuração da IA
2. **Preview em tempo real** do prompt completo por departamento
3. **Campo custom_instructions** destacado e documentado
4. **Modo Override** para substituição completa do prompt
5. **Contador de tokens** aproximado
6. **Botão de copiar** para usar em testes externos
