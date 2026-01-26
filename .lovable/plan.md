
# Plano: Habilitar Respostas em Áudio no make-webhook

## Visão Geral

Adicionar capacidade ao `make-webhook` para gerar e enviar respostas em áudio (TTS) usando ElevenLabs, além das respostas em texto. Isso permitirá que a IA Helena/Nina responda com mensagens de voz via integração Make.com.

## Infraestrutura Existente (Reutilizável)

| Componente | Status | Descrição |
|------------|--------|-----------|
| `elevenlabs-tts` | ✅ Pronto | Converte texto em áudio (MP3 → OGG/Opus) |
| `send-wa-media` | ✅ Pronto | Envia mídia via WhatsApp API |
| `system_settings` | ✅ Configurado | `audio_enabled: true`, voz: "Roberta" |
| `whatsapp-media` bucket | ✅ Disponível | Storage para arquivos de áudio |

## Configuração Atual de Áudio

```text
audio_enabled: true
audio_voice_id: RGymW84CSmfVugnA5tvA
audio_voice_name: Roberta - For Conversational
audio_mode: audio_only
```

## Fluxo de Processamento

```text
┌──────────────────┐     ┌────────────────┐     ┌──────────────────┐
│ Make envia       │────▶│ make-webhook   │────▶│ IA gera resposta │
│ mensagem         │     │ processa       │     │ em texto         │
└──────────────────┘     └────────────────┘     └──────────────────┘
                                                         │
                                                         ▼
                              ┌──────────────────────────────────────┐
                              │ audio_enabled?                       │
                              │ ┌────────────┐    ┌────────────────┐ │
                              │ │    SIM     │    │      NÃO       │ │
                              │ └─────┬──────┘    └───────┬────────┘ │
                              └───────┼───────────────────┼──────────┘
                                      │                   │
                                      ▼                   ▼
                              ┌──────────────┐    ┌───────────────┐
                              │ elevenlabs-  │    │ Retorna só    │
                              │ tts          │    │ texto         │
                              └──────┬───────┘    └───────────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │ Upload para  │
                              │ Storage      │
                              └──────┬───────┘
                                     │
                                     ▼
                              ┌────────────────────────────────────┐
                              │ Retorna JSON com:                  │
                              │ - result (texto)                   │
                              │ - audio_url (URL do áudio)         │
                              │ - audio_type (audio/ogg ou mp3)    │
                              └────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/make-webhook/index.ts` | Modificar | Adicionar geração de áudio TTS |

## Mudanças Técnicas

### 1. Nova Função: getAudioConfig

Buscar configurações de áudio do `system_settings`:

```typescript
interface AudioConfig {
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_max_chars: number;
}

async function getAudioConfig(supabase: any): Promise<AudioConfig | null> {
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
      audio_voice_name: config.audio_voice_name || 'Sarah',
      audio_mode: config.audio_mode || 'text_and_audio',
      audio_max_chars: config.audio_max_chars || 1000
    };
  } catch (error) {
    console.error('Error getting audio config:', error);
    return null;
  }
}
```

### 2. Nova Função: generateAudioResponse

Gerar áudio via ElevenLabs TTS:

```typescript
async function generateAudioResponse(
  supabase: any,
  text: string,
  audioConfig: AudioConfig
): Promise<{ audioUrl: string; isVoiceMessage: boolean } | null> {
  if (!audioConfig.audio_enabled) return null;
  
  // Limit text length for audio
  const textToConvert = text.length > audioConfig.audio_max_chars 
    ? text.substring(0, audioConfig.audio_max_chars) + '...'
    : text;
  
  try {
    console.log('🎙️ Generating TTS audio for Make response...');
    
    const { data, error } = await supabase.functions.invoke('elevenlabs-tts', {
      body: {
        text: textToConvert,
        voiceId: audioConfig.audio_voice_id
      }
    });
    
    if (error || !data?.success) {
      console.error('❌ TTS generation failed:', error || data?.error);
      return null;
    }
    
    console.log('✅ Audio generated:', data.audioUrl);
    return {
      audioUrl: data.audioUrl,
      isVoiceMessage: data.isVoiceMessage || false
    };
  } catch (error) {
    console.error('❌ Error in generateAudioResponse:', error);
    return null;
  }
}
```

### 3. Modificar Handler Principal

Após gerar a resposta da IA, verificar se áudio está habilitado e gerar:

```typescript
// --- Após obter aiResponse ---

// Get audio configuration
const audioConfig = await getAudioConfig(supabase);
let audioResult: { audioUrl: string; isVoiceMessage: boolean } | null = null;

if (audioConfig?.audio_enabled && aiResponse) {
  audioResult = await generateAudioResponse(supabase, aiResponse, audioConfig);
  
  if (audioResult) {
    console.log(`🎤 Audio generated for response: ${audioResult.audioUrl}`);
  }
}

// Save outbound message (include audio info)
if (aiResponse && conversationId) {
  await saveMessage(
    supabase, 
    conversationId, 
    phoneNumber, 
    aiResponse, 
    'outbound',
    undefined,
    audioResult ? {
      type: audioResult.isVoiceMessage ? 'audio' : 'audio',
      url: audioResult.audioUrl,
      mimeType: audioResult.isVoiceMessage ? 'audio/ogg' : 'audio/mpeg'
    } : undefined
  );
}
```

### 4. Modificar Resposta JSON

Incluir informações de áudio na resposta para o Make:

```typescript
return new Response(
  JSON.stringify({
    success: true,
    result: aiResponse,  // Texto da resposta (sempre incluído)
    phone: phoneNumber,
    agent,
    conversation_id: conversationId,
    // NOVO: Informações de áudio
    audio: audioResult ? {
      url: audioResult.audioUrl,
      type: audioResult.isVoiceMessage ? 'audio/ogg' : 'audio/mpeg',
      is_voice_message: audioResult.isVoiceMessage
    } : null,
    metadata: {
      development_detected: developmentDetected,
      c2s_transferred: c2sTransferred,
      contact_name: contact_name,
      media_processed: mediaProcessed || null,
      audio_enabled: audioConfig?.audio_enabled || false
    }
  }),
  { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

## Configuração no Make.com

O Make precisa ser configurado para usar a URL de áudio retornada:

### Opção 1: Enviar Áudio ao Invés de Texto
```text
Se {{audio.url}} existir:
  → Módulo WhatsApp: Enviar Áudio
    - Media URL: {{audio.url}}
    - Type: {{audio.type}}
Senão:
  → Módulo WhatsApp: Enviar Texto
    - Body: {{result}}
```

### Opção 2: Enviar Texto + Áudio (text_and_audio mode)
O Make pode enviar ambos dependendo do `audio_mode` configurado.

## Resposta JSON Enriquecida

```json
{
  "success": true,
  "result": "Olá! Que bom seu interesse...",
  "phone": "5548991109003",
  "agent": "helena",
  "conversation_id": "uuid-xxx",
  "audio": {
    "url": "https://wpjxsgxxhogzkkuznyke.supabase.co/storage/v1/object/public/whatsapp-media/ai-voice-1234567890.ogg",
    "type": "audio/ogg",
    "is_voice_message": true
  },
  "metadata": {
    "development_detected": "Villa Maggiore",
    "c2s_transferred": false,
    "contact_name": "João",
    "media_processed": null,
    "audio_enabled": true
  }
}
```

## Comportamento por Modo de Áudio

| Modo | Texto Enviado | Áudio Enviado |
|------|---------------|---------------|
| `text_only` | ✅ Sim | ❌ Não |
| `audio_only` | ❌ Não* | ✅ Sim |
| `text_and_audio` | ✅ Sim | ✅ Sim |

*O texto ainda é retornado no JSON para log/fallback, mas Make deve enviar apenas áudio.

## Mirroring de Canal (Opcional)

Se `audio_channel_mirroring` estiver ativo:
- Cliente envia áudio → IA responde com áudio
- Cliente envia texto → IA responde com texto

Isso pode ser implementado verificando `message_type` na entrada.

## Benefícios

1. **Experiência Natural**: Clientes recebem respostas em voz
2. **Voz Personalizada**: Usa a voz "Roberta" configurada
3. **Configurável**: Respeita configurações existentes do admin
4. **Fallback Seguro**: Se TTS falhar, texto ainda é enviado
5. **Zero Impacto**: whatsapp-webhook continua funcionando normalmente

## Plano de Testes

1. Enviar mensagem de texto via Make → Verificar se áudio é gerado
2. Verificar resposta JSON contém `audio.url`
3. Testar fallback quando TTS falha (deve retornar só texto)
4. Configurar Make para enviar áudio e testar no WhatsApp
5. Verificar que a conversa mostra o áudio no Chat UI
