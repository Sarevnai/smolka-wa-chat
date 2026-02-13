
# Incorporar Arquitetura 3-Layer (AGENTS.md) no Projeto

## Status: Fase A ✅ Completa | Fase B 🔄 Em Progresso

## Contexto

O documento AGENTS.md define uma arquitetura em 3 camadas para maximizar confiabilidade de agentes de IA:

1. **Directives** (O que fazer) - SOPs em Markdown, instrucoes claras
2. **Orchestration** (Decisao) - Roteamento inteligente, tratamento de erros
3. **Execution** (Trabalho deterministico) - Scripts confiaveis e testaveis

## Fase A: Directives Layer ✅ COMPLETA

- [x] A.1 - Tabela `ai_directives` criada com versionamento e RLS
- [x] A.2 - Seed com 5 directives extraidas dos prompts hardcoded
- [x] A.3 - `getPromptForDepartment()` agora async, busca directive do banco com hierarquia: Override > Directive > Hardcoded
- [x] A.4 - UI DirectiveEditor integrada na aba Prompt da config IA

## Fase B: Consolidar Execution Layer 🔄 EM PROGRESSO

### B.1 - Refatorar `ai-vendas` para usar `_shared/` ✅ CONCLUIDO

**Resultado**: Reduzido de 1077 para ~280 linhas (74% reducao)

**Modulos criados/usados**:
- `_shared/whatsapp.ts` (NOVO) - sendWhatsAppMessage, sendWhatsAppMedia, sendAIResponse, saveAndSendMessage
- `_shared/ai-call.ts` (NOVO) - callLLM (gateway Lovable/OpenAI unificado)
- `_shared/types.ts` - Development, ConversationMessage, AudioConfig
- `_shared/utils.ts` - formatCurrency
- `_shared/prompts.ts` - buildQuickTransferPrompt, toolsQuickTransfer
- `_shared/audio.ts` - getAudioConfig, generateAudioResponse

**Logica unica mantida no ai-vendas**:
- buildEmpreendimentoPrompt (prompt full mode com detalhes do empreendimento)
- toolsFull (enviar_lead_c2s + enviar_material)
- Out-of-scope detection (redirect locacao/admin para 48 9 9163-1011)
- First message welcome flow
- Material sending handler

### B.2 - Modularizar `whatsapp-webhook` ⏳ PENDENTE

- O whatsapp-webhook (1705 linhas) ainda tem logica duplicada
- Agora pode importar de `_shared/whatsapp.ts` e `_shared/ai-call.ts`
- Handlers a extrair: triage, text messages, media, status updates
- **Risco**: Alto - webhook de producao, precisa testar cada tipo de mensagem

### B.3 - Avaliar `ai-virtual-agent` 📋 MARCADO PARA FUTURO

- 4047 linhas, maior monolito do sistema
- **Ainda e chamado ativamente** pelo whatsapp-webhook (linha 1490)
- Duplica TUDO que existe em `_shared/` (regioes, qualificacao, prompts, property, etc.)
- **Decisao**: Manter como esta por enquanto, documentar divida tecnica
- **Plano futuro**: Quando for refatorar whatsapp-webhook (B.2), avaliar se pode substituir por make-webhook + _shared/

## Fase C: Self-Annealing e Observabilidade ⏳ PENDENTE

- [ ] C.1 - Tabela `ai_error_log` + logging estruturado
- [ ] C.2 - Dashboard de erros na UI
- [ ] C.3 - Auto-update de directives (futuro avancado)

## Modulos Compartilhados (_shared/)

| Modulo | Linhas | Funcao |
|---|---|---|
| `types.ts` | 296 | Interfaces e tipos compartilhados |
| `prompts.ts` | ~500 | Builders de prompt + tools + getPromptForDepartment (async) |
| `qualification.ts` | 752 | Extracao e qualificacao de leads |
| `property.ts` | ~200 | Busca e formatacao de imoveis Vista CRM |
| `regions.ts` | ~100 | Mapeamento bairros Florianopolis |
| `audio.ts` | 146 | TTS via ElevenLabs |
| `utils.ts` | 152 | Utilitarios gerais |
| `whatsapp.ts` | ~220 | **NOVO** - Envio WhatsApp + TTS |
| `ai-call.ts` | ~60 | **NOVO** - Gateway LLM unificado |
| `cors.ts` | ~10 | Headers CORS |

## Nota sobre Adaptacao ao Lovable

- **Directives** = tabela `ai_directives` (em vez de arquivos `.md` em disco)
- **Orchestration** = Edge Functions de webhook (em vez de um agente local)
- **Execution** = modulos em `_shared/` (em vez de scripts Python em `execution/`)
- **Self-annealing** = tabela de erros + sugestoes automaticas (planejado)
