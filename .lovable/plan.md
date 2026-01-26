

# Plano: Habilitar Áudio TTS em Ambas as Frentes

## Visão Geral

Adicionar capacidade de resposta em áudio (Text-to-Speech via ElevenLabs) para **ambas as frentes** de comunicação WhatsApp:

| Frente | Webhook | Situação Atual | Situação Proposta |
|--------|---------|----------------|-------------------|
| Marketing (API META) | `whatsapp-webhook` | Só texto | Texto + Áudio TTS |
| Atendimento (Make.com) | `make-webhook` | ✅ Já tem TTS | Mantém |

## Fluxo Atual vs Proposto

### Frente Marketing - Antes

```text
Cliente responde → whatsapp-webhook → ai-marketing-agent 
                                           ↓
                                    { response: "texto..." }
                                           ↓
                                    send-wa-message (só texto)
```

### Frente Marketing - Depois

```text
Cliente responde → whatsapp-webhook → ai-marketing-agent 
                                           ↓
                                    { response: "texto..." }
                                           ↓
                                ┌──────────────────────────────┐
                                │ audio_enabled?               │
                                │    ↓                  ↓      │
                                │   SIM                NÃO     │
                                │    ↓                  ↓      │
                                │ elevenlabs-tts    texto só   │
                                │    ↓                         │
                                │ send-wa-media                │
                                └──────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/whatsapp-webhook/index.ts` | Modificar | Adicionar geração de áudio TTS após resposta do `ai-marketing-agent` |

## Mudanças Técnicas Detalhadas

### 1. Adicionar Interfaces no Início do Arquivo

```typescript
// Audio TTS configuration
interface AudioConfig {
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_max_chars: number;
}
```

### 2. Nova Função: getAudioConfig

Buscar configurações de áudio do `system_settings`:

```typescript
async function getAudioConfig(): Promise<AudioConfig | null> {
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_agent_config')
      .single();
    
    if (!data?.setting_value) return null;
    
    const config = data.setting_value;
    return {
      audio_enabled: config.audio_enabled || false,
      audio_voice_id: config.audio_voice_id || 'EXAVITQu4vr4xnSDxMaL',
      audio_mode: config.audio_mode || 'text_and_audio',
      audio_max_chars: config.audio_max_chars || 1000
    };
  } catch (error) {
    console.error('Error getting audio config:', error);
    return null;
  }
}
```

### 3. Nova Função: generateAndSendAudio

Gerar áudio via TTS e enviar via WhatsApp:

```typescript
async function generateAndSendAudio(
  phoneNumber: string,
  text: string,
  conversationId: string | null,
  audioConfig: AudioConfig
): Promise<boolean> {
  try {
    // Limit text for TTS
    const textToConvert = text.length > audioConfig.audio_max_chars 
      ? text.substring(0, audioConfig.audio_max_chars) + '...'
      : text;
    
    console.log('🎙️ Generating TTS audio for marketing response...');
    
    // Generate audio via elevenlabs-tts
    const { data: ttsResult, error: ttsError } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text: textToConvert,
        voiceId: audioConfig.audio_voice_id
      }
    });
    
    if (ttsError || !ttsResult?.success) {
      console.error('❌ TTS generation failed:', ttsError || ttsResult?.error);
      return false;
    }
    
    console.log('✅ Audio generated:', ttsResult.audioUrl);
    
    // Send audio via WhatsApp
    const { error: sendError } = await supabase.functions.invoke('send-wa-media', {
      body: {
        to: phoneNumber,
        mediaUrl: ttsResult.audioUrl,
        mediaType: ttsResult.isVoiceMessage ? 'audio' : 'audio',
        mimeType: ttsResult.contentType || 'audio/mpeg',
        conversation_id: conversationId
      }
    });
    
    if (sendError) {
      console.error('❌ Error sending audio:', sendError);
      return false;
    }
    
    console.log('✅ Audio sent to WhatsApp');
    return true;
    
  } catch (error) {
    console.error('❌ Error in generateAndSendAudio:', error);
    return false;
  }
}
```

### 4. Modificar handleN8NTrigger - Seção Marketing

Localização: Linhas ~1235-1273 (após enviar resposta de texto do marketing agent)

**Código Atual:**
```typescript
// Send AI response back to WhatsApp
if (aiResult?.response) {
  const { error: sendError } = await supabase.functions.invoke('send-wa-message', {
    body: {
      to: phoneNumber,
      text: aiResult.response,
      conversation_id: conversation?.id
    }
  });
  
  if (sendError) {
    console.error('❌ Error sending marketing agent response:', sendError);
  } else {
    console.log('✅ Marketing agent response sent to WhatsApp');
  }
}
```

**Código Novo:**
```typescript
// Send AI response back to WhatsApp
if (aiResult?.response) {
  // Get audio configuration
  const audioConfig = await getAudioConfig();
  
  // Determine what to send based on audio_mode
  const sendText = !audioConfig?.audio_enabled || 
                   audioConfig.audio_mode === 'text_only' || 
                   audioConfig.audio_mode === 'text_and_audio';
  
  const sendAudio = audioConfig?.audio_enabled && 
                    (audioConfig.audio_mode === 'audio_only' || 
                     audioConfig.audio_mode === 'text_and_audio');
  
  // Send text (unless audio_only mode)
  if (sendText) {
    const { error: sendError } = await supabase.functions.invoke('send-wa-message', {
      body: {
        to: phoneNumber,
        text: aiResult.response,
        conversation_id: conversation?.id
      }
    });
    
    if (sendError) {
      console.error('❌ Error sending marketing agent text response:', sendError);
    } else {
      console.log('✅ Marketing agent text response sent to WhatsApp');
    }
  }
  
  // Send audio (if enabled)
  if (sendAudio) {
    const audioSent = await generateAndSendAudio(
      phoneNumber,
      aiResult.response,
      conversation?.id || null,
      audioConfig
    );
    
    if (!audioSent && audioConfig.audio_mode === 'audio_only') {
      // Fallback: if audio_only mode failed, send text
      console.log('⚠️ Audio failed in audio_only mode, falling back to text');
      await supabase.functions.invoke('send-wa-message', {
        body: {
          to: phoneNumber,
          text: aiResult.response,
          conversation_id: conversation?.id
        }
      });
    }
  }
}
```

### 5. Aplicar Mesmo Padrão para ai-arya-vendas

Localização: Linhas ~1117-1148 (após resposta do ai-arya-vendas)

O `ai-arya-vendas` já envia suas próprias mensagens internamente via `send-wa-message`. Para adicionar TTS:

1. O `ai-arya-vendas` precisa retornar a resposta no resultado para que o webhook possa gerar áudio
2. OU modificar o `ai-arya-vendas` diretamente para gerar áudio

**Recomendação:** Modificar o retorno do `ai-arya-vendas` para incluir a resposta, permitindo que o `whatsapp-webhook` controle o envio de áudio centralmente.

### 6. Aplicar para ai-virtual-agent (Nina Geral)

Localização: Linhas ~1343-1360

Similar ao marketing, adicionar geração de áudio após resposta da Nina geral.

## Comportamento por Modo de Áudio

| Modo | Texto | Áudio | Descrição |
|------|-------|-------|-----------|
| `text_only` | ✅ | ❌ | Apenas texto (padrão atual) |
| `audio_only` | ❌* | ✅ | Apenas áudio (fallback para texto se falhar) |
| `text_and_audio` | ✅ | ✅ | Envia ambos |

## Resumo das Edge Functions Impactadas

| Função | Modificação |
|--------|-------------|
| `whatsapp-webhook` | Adicionar TTS para marketing, vendas e atendimento geral |
| `make-webhook` | ✅ Já implementado - sem alterações |
| `elevenlabs-tts` | ✅ Já existe - será reutilizado |
| `send-wa-media` | ✅ Já existe - será usado para enviar áudios |

## Fluxo Final Completo

```text
                    ┌─────────────────────────────────────────┐
                    │         MENSAGEM RECEBIDA               │
                    └─────────────────────┬───────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              │                           │                           │
              ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │ API META Direct │         │ Make.com        │         │ API META Direct │
    │ (Marketing)     │         │ (Atendimento)   │         │ (Vendas/Geral)  │
    └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
             │                           │                           │
             ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │ ai-marketing-   │         │ ai-arya-vendas  │         │ ai-virtual-     │
    │ agent (Nina)    │         │ ou Nina         │         │ agent (Nina)    │
    └────────┬────────┘         └────────┬────────┘         └────────┬────────┘
             │                           │                           │
             │                           │                           │
             ▼                           ▼                           ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                        DECISÃO DE ÁUDIO                                 │
    │                                                                         │
    │   audio_mode = 'text_only'     → Envia só texto                         │
    │   audio_mode = 'audio_only'    → Gera TTS → Envia só áudio              │
    │   audio_mode = 'text_and_audio'→ Envia texto + Gera TTS → Envia áudio   │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘
             │                           │                           │
             ▼                           ▼                           ▼
    ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
    │ send-wa-message │         │ JSON para Make  │         │ send-wa-message │
    │ send-wa-media   │         │ (Make envia)    │         │ send-wa-media   │
    └─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Benefícios

1. **Consistência**: Ambas as frentes têm capacidade de áudio
2. **Configurável**: Administrador controla via painel existente
3. **Reutilização**: Usa infraestrutura TTS já implementada
4. **Fallback Seguro**: Se TTS falhar, texto é enviado
5. **Centralizado**: Lógica de áudio no `whatsapp-webhook` facilita manutenção

## Testes Recomendados

1. Enviar mensagem para número Marketing → Verificar áudio gerado
2. Enviar mensagem mencionando empreendimento → Helena responde com áudio
3. Enviar mensagem fora do horário comercial → Nina responde com áudio
4. Testar modo `audio_only` → Confirmar só áudio enviado
5. Testar modo `text_and_audio` → Confirmar ambos enviados
6. Simular falha de TTS → Verificar fallback para texto

