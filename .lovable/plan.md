
# Incorporar Arquitetura 3-Layer (AGENTS.md) no Projeto

## Contexto

O documento AGENTS.md define uma arquitetura em 3 camadas para maximizar confiabilidade de agentes de IA:

1. **Directives** (O que fazer) - SOPs em Markdown, instrucoes claras
2. **Orchestration** (Decisao) - Roteamento inteligente, tratamento de erros
3. **Execution** (Trabalho deterministico) - Scripts confiaveis e testaveis

## Diagnostico do Estado Atual

### O que ja existe (parcialmente alinhado)

- **Execution (Layer 3)**: `supabase/functions/_shared/` ja contem modulos deterministic isolados:
  - `qualification.ts` (752 linhas) - extracao e qualificacao de leads
  - `prompts.ts` (419 linhas) - builders de prompt por departamento
  - `property.ts` - busca e formatacao de imoveis
  - `regions.ts` - mapeamento de bairros/regioes
  - `audio.ts` - TTS via ElevenLabs
  - `utils.ts` - utilitarios

- **Orchestration (Layer 2)**: `make-webhook` (1419 linhas) e `whatsapp-webhook` (1705 linhas) fazem roteamento

### Problemas Identificados

| Problema | Impacto | Onde |
|---|---|---|
| `ai-vendas/index.ts` (1077 linhas) duplica TUDO que existe em `_shared/` | Manutencao dupla, divergencia de comportamento | `supabase/functions/ai-vendas/` |
| `whatsapp-webhook` tem 1705 linhas monoliticas com logica duplicada do `_shared/` | Dificuldade de manutencao | `supabase/functions/whatsapp-webhook/` |
| Nao existe camada de Directives | SOPs estao embutidas no codigo (prompts hardcoded), nao editaveis pelo admin | `_shared/prompts.ts`, `ai-vendas/index.ts` |
| `ai-virtual-agent` (4047 linhas!) e o maior monolito | Impossivel manter/testar | `supabase/functions/ai-virtual-agent/` |
| Sem self-annealing | Erros nao atualizam instrucoes automaticamente | Todos os agentes |

### Mapa dos Agentes Atuais

```text
Entrada WhatsApp
    |
    +---> whatsapp-webhook (API Oficial - Vendas/Marketing)
    |         |
    |         +---> ai-vendas (empreendimentos, C2S)
    |
    +---> make-webhook (Make.com - Locacao/Vendas/Admin)
    |         |
    |         +---> _shared/prompts.ts (gera prompt por dept)
    |         +---> _shared/qualification.ts (qualifica lead)
    |         +---> _shared/property.ts (busca imoveis)
    |
    +---> ai-virtual-agent (agente generico, 4047 linhas)
    +---> ai-reengagement (reengajamento automatico)
    +---> ai-communicator (chat interno admin)
    +---> ai-assistant (sugestoes para atendentes)
    +---> ai-marketing-agent (campanhas)
```

## Plano de Incorporacao - 3 Fases

### Fase A: Directives Layer (Criar camada de instrucoes editaveis)

**Objetivo**: Extrair SOPs dos prompts hardcoded para uma estrutura editavel, alinhando com o conceito de "directives" do AGENTS.md.

**Abordagem adaptada ao Lovable**: Como nao temos filesystem local como o AGENTS.md propoe, usaremos a tabela `ai_agent_config` (campo `prompt_overrides`) que ja existe mas esta subutilizada, combinada com uma nova tabela `ai_directives`.

**Item A.1 - Criar tabela `ai_directives`**
- Nova tabela para armazenar SOPs editaveis por departamento/contexto
- Colunas: `id`, `department` (enum), `context` (ex: 'qualificacao', 'encaminhamento', 'objecoes'), `directive_content` (text/markdown), `version` (int), `is_active` (boolean), `updated_at`, `updated_by`
- Permite versionamento e rollback
- Arquivos: nova migration SQL
- Risco: Baixo (aditivo)

**Item A.2 - Seed com directives atuais**
- Extrair os SOPs que hoje estao hardcoded em `_shared/prompts.ts` (buildLocacaoPrompt, buildVendasPrompt, etc.) e em `ai-vendas/index.ts` (buildQuickTransferPrompt)
- Popular a tabela com o conteudo existente
- Arquivos: migration SQL de seed
- Risco: Nenhum

**Item A.3 - Atualizar prompt builders para ler de `ai_directives`**
- `_shared/prompts.ts`: `getPromptForDepartment()` passa a buscar directive ativa do banco antes de usar o fallback hardcoded
- Hierarquia: `prompt_overrides` (config admin) > `ai_directives` (SOPs versionadas) > fallback hardcoded
- Arquivos: `supabase/functions/_shared/prompts.ts`
- Risco: Medio (precisa testar todos os fluxos de IA)

**Item A.4 - UI para editar directives**
- Nova secao na pagina de configuracao da IA (`/admin/ia-config`) na aba "Prompt"
- Lista de directives por departamento com editor Markdown
- Historico de versoes com diff
- Arquivos: `src/components/ai-config/AIPromptTab.tsx`, novo componente `DirectiveEditor.tsx`
- Risco: Baixo

### Fase B: Consolidar Execution Layer (Eliminar duplicacao)

**Objetivo**: Garantir que toda logica deterministica vive em `_shared/` e que nenhum agente duplica codigo.

**Item B.1 - Refatorar `ai-vendas` para usar `_shared/`**
- O `ai-vendas/index.ts` (1077 linhas) duplica: prompts, tools, regioes, formatacao, envio WhatsApp
- Refatorar para importar de `_shared/` como o `make-webhook` ja faz
- Estimativa: reduzir de 1077 para ~200 linhas (apenas orquestracao)
- Arquivos: `supabase/functions/ai-vendas/index.ts`
- Risco: Alto - precisa testar fluxo de vendas de empreendimentos end-to-end
- Teste: Simular lead de landing page, verificar qualificacao e encaminhamento C2S

**Item B.2 - Modularizar `whatsapp-webhook`**
- Extrair handlers especificos para `_shared/`:
  - Handler de mensagens de texto
  - Handler de midia (audio, imagem)
  - Handler de status updates
  - Handler de triagem
- Manter no webhook apenas o roteamento
- Arquivos: `supabase/functions/whatsapp-webhook/index.ts`, novos modulos em `_shared/`
- Risco: Alto - webhook de producao
- Teste: Enviar mensagens de texto, audio, imagem via WhatsApp e verificar processamento

**Item B.3 - Avaliar/modularizar `ai-virtual-agent`**
- Com 4047 linhas, e o maior monolito. Avaliar se ainda e usado ativamente ou se foi substituido pelo fluxo `make-webhook` + `_shared/`
- Se ativo: extrair para modulos
- Se inativo: deprecar
- Arquivos: `supabase/functions/ai-virtual-agent/index.ts`
- Risco: Medio (precisa confirmar uso)

### Fase C: Self-Annealing e Observabilidade

**Objetivo**: Implementar o loop de auto-correcao do AGENTS.md adaptado ao contexto SaaS.

**Item C.1 - Logging estruturado de erros de IA**
- Criar tabela `ai_error_log` com: `agent_name`, `error_type`, `error_message`, `context` (JSON), `resolution`, `created_at`
- Todos os agentes logam erros de forma estruturada
- Arquivos: migration SQL, atualizacao em `_shared/utils.ts`
- Risco: Baixo

**Item C.2 - Dashboard de erros na UI**
- Nova secao no dashboard de IA (`/admin/ia-dashboard`) com:
  - Erros por agente nas ultimas 24h/7d
  - Taxa de sucesso por departamento
  - Erros recorrentes agrupados
- Arquivos: `src/pages/admin/AIMainDashboard.tsx`, novo componente
- Risco: Baixo

**Item C.3 - Auto-update de directives (futuro)**
- Quando um erro recorrente for identificado, sugerir atualizacao na directive correspondente
- Ex: se o agente de locacao falha 3x em "bairro nao encontrado", sugerir adicionar o bairro a directive
- Implementacao: Edge function periodica que analisa `ai_error_log` e sugere updates em `ai_directives`
- Arquivos: nova edge function `ai-self-annealing`
- Risco: Medio
- Nota: Este item e mais avancado e pode ser implementado apos as fases A e B estarem estaveis

## Checklist de Implementacao

| # | Item | Fase | Risco | Dependencia |
|---|---|---|---|---|
| 1 | Criar tabela `ai_directives` | A | Baixo | - |
| 2 | Seed com directives existentes | A | Nenhum | 1 |
| 3 | Atualizar `getPromptForDepartment()` | A | Medio | 1, 2 |
| 4 | UI editor de directives | A | Baixo | 1 |
| 5 | Refatorar `ai-vendas` para `_shared/` | B | Alto | 3 |
| 6 | Modularizar `whatsapp-webhook` | B | Alto | 3 |
| 7 | Avaliar `ai-virtual-agent` | B | Medio | - |
| 8 | Tabela `ai_error_log` + logging | C | Baixo | - |
| 9 | Dashboard de erros | C | Baixo | 8 |
| 10 | Auto-update de directives | C | Medio | 8, 1 |

## Ordem Recomendada

Comecar pela **Fase A (items 1-4)** pois e aditiva (nao quebra nada existente) e ja traz valor imediato: directives editaveis pelo admin sem mexer em codigo.

Depois **Fase B (items 5-7)** para eliminar duplicacao e reduzir risco de divergencia.

Por ultimo **Fase C (items 8-10)** para observabilidade e auto-correcao.

## Nota sobre Adaptacao ao Lovable

O AGENTS.md original assume Python scripts locais + filesystem. No contexto Lovable:
- **Directives** = tabela `ai_directives` (em vez de arquivos `.md` em disco)
- **Orchestration** = Edge Functions de webhook (em vez de um agente local)
- **Execution** = modulos em `_shared/` (em vez de scripts Python em `execution/`)
- **Self-annealing** = tabela de erros + sugestoes automaticas (em vez de atualizar arquivos locais)

Os principios fundamentais sao preservados: separacao de concerns, logica deterministica fora do LLM, instrucoes editaveis, e melhoria continua.
