
# Correção do Make Webhook - 4 Problemas Identificados

## Problemas Relatados

1. **Triagem não funciona** - A Helena não está fazendo o fluxo de triagem corretamente
2. **Áudio em todas as mensagens** - Deve gerar áudio apenas para mensagens de voz (rapport)
3. **Não considera contexto** - Fica perguntando o nome mesmo quando já sabe
4. **Villa Maggiore no Make** - Leads do Villa Maggiore devem usar API direta, não Make

## Análise dos Logs

Analisando os logs do `make-webhook`:
```
🏗️ Development lead found: Villa Maggiore
🏗️ Routing to Helena for development: Villa Maggiore
```

O problema: leads do Villa Maggiore estão sendo atendidos via Make (número 4891631011) quando deveriam ir pela API direta (número 4823980016).

Histórico de conversa mostra:
- Cliente disse "Ian Veras" → "Prazer em te conhecer, Ian!"
- Depois de "A localização" → "E qual é o seu nome? Assim posso te ajudar melhor!"

**Problema de contexto**: A IA está recebendo o histórico, mas o prompt não instrui corretamente sobre usar o nome já coletado.

**Problema de áudio**: Linha 1191-1197 gera áudio para TODAS as respostas:
```typescript
if (audioConfig?.audio_enabled && aiResponse) {
  audioResult = await generateAudioResponse(aiResponse, audioConfig);
}
```

---

## Soluções Propostas

### 1. Bloquear Villa Maggiore no Make Webhook

O Make webhook deve recusar leads de empreendimentos específicos (Villa Maggiore) que são atendidos pela API direta:

```typescript
// Lista de empreendimentos que NÃO devem ser atendidos via Make
const DIRECT_API_DEVELOPMENTS = ['Villa Maggiore', 'villa-maggiore'];

// Se detectar empreendimento da API direta, recusar atendimento
if (developmentLead || mentionedDevelopment) {
  const devName = developmentLead?.development_name || mentionedDevelopment?.development_name;
  if (DIRECT_API_DEVELOPMENTS.some(d => devName?.toLowerCase().includes(d.toLowerCase()))) {
    console.log(`⚠️ Development "${devName}" is handled by direct API, skipping Make response`);
    return new Response(JSON.stringify({
      success: true,
      skipped: true,
      reason: 'development_handled_by_direct_api',
      result: null
    }), { status: 200, headers: {...} });
  }
}
```

### 2. Gerar Áudio Apenas para Mensagens de Voz

Modificar a lógica de geração de áudio para verificar se a mensagem do cliente foi de voz:

```typescript
// ANTES (linha 1185-1197):
if (audioConfig?.audio_enabled && aiResponse) {
  audioResult = await generateAudioResponse(aiResponse, audioConfig);
}

// DEPOIS:
// Only generate audio response when the user sent a voice message (rapport strategy)
const shouldGenerateAudio = audioConfig?.audio_enabled && 
                            aiResponse && 
                            isAudio; // isAudio = message_type === 'audio' || 'voice'

if (shouldGenerateAudio) {
  console.log('🎙️ Generating audio response to match user voice message (rapport)');
  audioResult = await generateAudioResponse(aiResponse, audioConfig);
} else if (audioConfig?.audio_enabled) {
  console.log('💬 Text-only response (user sent text message)');
}
```

### 3. Corrigir Contexto do Cliente (Nome)

O problema está no prompt e no histórico. A IA recebe o histórico mas o prompt `buildQuickTransferPrompt` não enfatiza suficientemente o uso do contexto existente.

Adicionar ao prompt:

```typescript
// No buildQuickTransferPrompt, adicionar seção:
CONTEXTO IMPORTANTE:
${conversationHistory.length > 0 ? `
- Esta NÃO é a primeira mensagem do cliente
- LEIA o histórico abaixo e NÃO repita perguntas já respondidas
- Se o cliente já disse o nome, USE esse nome e NÃO pergunte novamente
- Se o cliente já disse se quer morar/investir, NÃO pergunte novamente
` : ''}
```

E melhorar a passagem do nome do contato:
```typescript
// Buscar nome do contato se existir
const existingContactName = await getContactName(supabase, phoneNumber);
const resolvedContactName = existingContactName || developmentLead?.contact_name || contact_name;

// Incluir no prompt
const systemPrompt = buildQuickTransferPrompt(development, resolvedContactName, isFirstMessage, history);
```

### 4. Melhorar Triagem para Leads Genéricos

O fluxo de triagem deve ser mais robusto. Logs mostram que a triagem não está funcionando porque:
- `conversation_states` está vazio para o telefone testado
- O código verifica `convState?.triage_stage` mas pode não estar salvando corretamente

Adicionar logging de debug:
```typescript
console.log(`📊 Triage debug - Stage: ${currentStage}, Existing name: ${existingName}, Phone: ${phoneNumber}`);
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | 4 correções principais |

### Detalhamento Técnico

**Linha ~995-1010**: Adicionar verificação de empreendimentos da API direta
```typescript
const DIRECT_API_DEVELOPMENTS = ['villa maggiore'];

if (developmentLead || mentionedDevelopment) {
  const devName = (developmentLead?.development_name || mentionedDevelopment?.development_name || '').toLowerCase();
  
  if (DIRECT_API_DEVELOPMENTS.some(d => devName.includes(d))) {
    console.log(`⛔ Development "${devName}" handled by direct WhatsApp API, not Make`);
    return new Response(JSON.stringify({
      success: true,
      skipped: true,
      reason: 'handled_by_direct_api',
      message: 'Este empreendimento é atendido pelo número da API direta'
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}
```

**Linha ~1185-1197**: Gerar áudio apenas para voice messages
```typescript
// Generate audio ONLY if user sent voice/audio message (rapport strategy)
const userSentVoice = message_type === 'audio' || message_type === 'voice';
const shouldGenerateAudio = audioConfig?.audio_enabled && aiResponse && userSentVoice;

if (shouldGenerateAudio) {
  console.log('🎙️ Generating audio to match user voice (rapport)');
  audioResult = await generateAudioResponse(aiResponse, audioConfig);
}
```

**Linha ~1010-1020**: Buscar nome existente do contato
```typescript
// Fetch existing contact name before calling AI
const existingContactName = await getContactName(supabase, phoneNumber);
const resolvedContactName = existingContactName || developmentLead?.contact_name || contact_name;
console.log(`👤 Contact name: ${resolvedContactName || 'not set'}`);
```

**Linha ~110-193** (buildQuickTransferPrompt): Adicionar instrução de contexto
```typescript
${history.length > 0 ? `
═══════════════════════════════════════════════════════════════
📜 CONTEXTO IMPORTANTE
═══════════════════════════════════════════════════════════════

Esta conversa já tem histórico. NUNCA repita perguntas:
- Se já sabemos o nome, USE-O e não pergunte novamente
- Se já sabemos morar/investir, não pergunte novamente
- Leia o histórico e continue de onde parou

${resolvedContactName ? `NOME DO CLIENTE: ${resolvedContactName}` : ''}
` : ''}
```

---

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAKE WEBHOOK (4891631011)                    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   É lead de empreendimento? │
              └──────────────┬──────────────┘
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   ┌─────────────────────┐
         │  Villa Maggiore? │   │  Outro ou nenhum    │
         └────────┬─────────┘   └──────────┬──────────┘
                  │                        │
                  ▼                        ▼
         ┌──────────────────┐     ┌─────────────────────┐
         │  SKIP - handled  │     │  Continuar triagem  │
         │  by API direta   │     │  normal via Make    │
         │  (200 OK skip)   │     └──────────┬──────────┘
         └──────────────────┘                │
                                             ▼
                            ┌─────────────────────────────┐
                            │   Gerar resposta com IA     │
                            │   (usando contexto/nome)    │
                            └──────────────┬──────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │  Cliente enviou ÁUDIO?      │
                            └──────────────┬──────────────┘
                                  ┌────────┴────────┐
                                  │                 │
                                  ▼                 ▼
                         ┌────────────┐      ┌────────────┐
                         │    SIM     │      │    NÃO     │
                         │ Gerar TTS  │      │ Só texto   │
                         └────────────┘      └────────────┘
```

---

## Resultado Esperado

1. **Villa Maggiore**: Leads serão recusados pelo Make (retorna skip) e atendidos apenas pela API direta
2. **Áudio**: Gerado apenas quando o cliente enviar mensagem de voz, criando rapport
3. **Contexto**: IA usará o nome já conhecido e não repetirá perguntas
4. **Triagem**: Funcionará normalmente para leads genéricos (não-empreendimentos)
