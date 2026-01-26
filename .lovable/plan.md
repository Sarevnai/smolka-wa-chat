
# Plano: Suporte a Audio e Midia no make-webhook

## Visao Geral

Adicionar capacidade ao `make-webhook` para processar mensagens de audio e outros tipos de midia (imagem, video, documento) recebidas via Make.com. O audio sera transcrito automaticamente via Whisper e processado como texto pela IA.

## Estrutura de Dados do Make para Midia

O Make.com pode enviar diferentes formatos de midia. Vamos expandir a interface `MakeWebhookRequest`:

```text
TIPOS DE MENSAGEM DO MAKE:
┌─────────────────────────────────────────────────────────────────────┐
│  message_type: "text"                                                │
│  - phone, message, contact_name, message_id                         │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  message_type: "audio" | "voice"                                     │
│  - media_url: URL do arquivo no storage do WhatsApp/Make            │
│  - media_id: ID da midia no WhatsApp                                │
│  - media_mime: Tipo MIME (audio/ogg, audio/mp4, etc)                │
└─────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────┐
│  message_type: "image" | "video" | "document"                        │
│  - media_url: URL do arquivo                                        │
│  - media_id: ID da midia                                            │
│  - media_caption: Legenda enviada junto com a midia                 │
│  - media_filename: Nome do arquivo (para documentos)                │
│  - media_mime: Tipo MIME                                            │
└─────────────────────────────────────────────────────────────────────┘
```

## Fluxo de Processamento

```text
AUDIO:
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│ Make envia   │────▶│ make-webhook   │────▶│ transcribe-audio │
│ media_url    │     │ detecta audio  │     │ (Whisper API)    │
└──────────────┘     └────────────────┘     └──────────────────┘
                              │                      │
                              │              ┌───────┴───────┐
                              │              │ Texto         │
                              │              │ transcrito    │
                              │              └───────────────┘
                              ▼
                    ┌─────────────────────┐
                    │ Processa como texto │
                    │ normal pela IA      │
                    └─────────────────────┘

IMAGEM/VIDEO/DOCUMENTO:
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│ Make envia   │────▶│ make-webhook   │────▶│ Salva no banco   │
│ media_url    │     │ detecta midia  │     │ com media_url    │
└──────────────┘     └────────────────┘     └──────────────────┘
                              │
                              ▼
                    ┌─────────────────────────────────────────┐
                    │ IA recebe: "[Audio recebido: <texto>]"  │
                    │ ou "[Imagem recebida: <caption>]"       │
                    └─────────────────────────────────────────┘
```

## Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/make-webhook/index.ts` | **Modificar** | Adicionar suporte a midia |

## Mudancas Tecnicas

### 1. Atualizar Interface MakeWebhookRequest

```typescript
interface MakeWebhookRequest {
  phone: string;
  message: string;        // Texto OU vazio para audio/midia
  contact_name?: string;
  message_id?: string;
  timestamp?: string;
  message_type?: string;  // "text" | "audio" | "voice" | "image" | "video" | "document"
  
  // Novos campos para midia
  media_url?: string;     // URL publica da midia
  media_id?: string;      // ID da midia no WhatsApp
  media_mime?: string;    // Tipo MIME (audio/ogg, image/jpeg, etc)
  media_caption?: string; // Legenda da midia
  media_filename?: string;// Nome do arquivo (documentos)
}
```

### 2. Nova Funcao: transcribeAudio

```typescript
async function transcribeAudio(
  supabase: any, 
  audioUrl: string
): Promise<string | null> {
  try {
    console.log('🎤 Transcribing audio from Make:', audioUrl);
    
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioUrl }
    });
    
    if (error || !data?.success) {
      console.error('❌ Transcription failed:', error || data?.error);
      return null;
    }
    
    console.log('✅ Audio transcribed:', data.text?.substring(0, 100));
    return data.text;
    
  } catch (error) {
    console.error('❌ Error in transcribeAudio:', error);
    return null;
  }
}
```

### 3. Nova Funcao: saveMessageWithMedia

Modificar `saveMessage` para suportar campos de midia:

```typescript
async function saveMessage(
  supabase: any,
  conversationId: string | null,
  phoneNumber: string,
  body: string,
  direction: 'inbound' | 'outbound',
  messageId?: string,
  mediaInfo?: {
    type?: string;
    url?: string;
    caption?: string;
    filename?: string;
    mimeType?: string;
  }
): Promise<number | null> {
  try {
    const messageData: any = {
      conversation_id: conversationId,
      wa_message_id: messageId || `make_${direction}_${Date.now()}`,
      wa_from: direction === 'inbound' ? phoneNumber : null,
      wa_to: direction === 'outbound' ? phoneNumber : null,
      direction,
      body,
      wa_timestamp: new Date().toISOString(),
      department_code: 'vendas',
      // Campos de midia
      media_type: mediaInfo?.type || null,
      media_url: mediaInfo?.url || null,
      media_caption: mediaInfo?.caption || null,
      media_filename: mediaInfo?.filename || null,
      media_mime_type: mediaInfo?.mimeType || null
    };
    // ... resto da funcao
  }
}
```

### 4. Modificar Handler Principal

No handler principal, adicionar logica para:

1. **Detectar tipo de mensagem** (texto vs midia)
2. **Para audio**: Transcrever antes de processar
3. **Para outras midias**: Usar caption ou mensagem generica
4. **Salvar com campos de midia** preenchidos

```typescript
// Parse request body
const body: MakeWebhookRequest = await req.json();
const { 
  phone, 
  message, 
  contact_name, 
  message_id, 
  message_type,
  media_url,
  media_id,
  media_mime,
  media_caption,
  media_filename
} = body;

// Determine message content based on type
let messageContent = message || '';
let mediaInfo: { type?: string; url?: string; caption?: string; filename?: string; mimeType?: string } | undefined;

// Handle media types
const isAudio = message_type === 'audio' || message_type === 'voice';
const isMedia = ['image', 'video', 'document', 'sticker'].includes(message_type || '');

if (isAudio && media_url) {
  // Transcribe audio
  const transcribedText = await transcribeAudio(supabase, media_url);
  messageContent = transcribedText || '[Audio nao pude ser transcrito]';
  
  mediaInfo = {
    type: 'audio',
    url: media_url,
    caption: messageContent,
    mimeType: media_mime
  };
  
  console.log(`🎤 Audio transcribed: "${messageContent.substring(0, 50)}..."`);
  
} else if (isMedia && media_url) {
  // For other media, use caption or generic message
  messageContent = media_caption || `[${message_type === 'image' ? 'Imagem' : message_type === 'video' ? 'Video' : 'Documento'} recebido]`;
  
  mediaInfo = {
    type: message_type,
    url: media_url,
    caption: media_caption,
    filename: media_filename,
    mimeType: media_mime
  };
  
  console.log(`📎 Media received: ${message_type} - ${media_url}`);
}
```

### 5. Resposta Especial para Midias

Se a mensagem foi uma midia, podemos incluir contexto extra para a IA:

```typescript
// Provide context to AI about media
let aiPromptMessage = messageContent;

if (isAudio) {
  aiPromptMessage = `[O cliente enviou um audio que foi transcrito automaticamente]\n\n"${messageContent}"`;
} else if (isMedia) {
  aiPromptMessage = `[O cliente enviou ${message_type === 'image' ? 'uma imagem' : message_type === 'video' ? 'um video' : 'um documento'}${media_caption ? ` com legenda: "${media_caption}"` : ''}]`;
}
```

## Mapeamento no Make.com

O usuario deve configurar o HTTP Request no Make para enviar os campos de midia:

```json
{
  "phone": "{{1.messages[].from}}",
  "message": "{{1.messages[].text.body}}",
  "contact_name": "{{1.contacts[].profile.name}}",
  "message_id": "{{1.messages[].id}}",
  "message_type": "{{1.messages[].type}}",
  "media_url": "{{1.messages[].audio.url}}",
  "media_id": "{{1.messages[].audio.id}}",
  "media_mime": "{{1.messages[].audio.mime_type}}",
  "media_caption": "{{1.messages[].image.caption}}"
}
```

Nota: O Make pode precisar de um Router para tratar diferentes tipos de mensagem com mapeamentos diferentes.

## Tratamento de Erro

Se a transcricao falhar:
- Log do erro
- Usar fallback: `"[Audio recebido, mas nao foi possivel transcrever]"`
- IA responde pedindo para o cliente digitar a mensagem

```typescript
if (!transcribedText) {
  messageContent = '[O cliente enviou um audio que nao pude entender. Por favor, peca para ele digitar a mensagem.]';
}
```

## Resposta Enriquecida

A resposta do webhook incluira informacao sobre midia processada:

```json
{
  "success": true,
  "result": "Entendi! Voce mencionou que...",
  "phone": "5548991109003",
  "agent": "helena",
  "conversation_id": "uuid-xxx",
  "metadata": {
    "development_detected": "Villa Maggiore",
    "c2s_transferred": false,
    "contact_name": "Joao",
    "media_processed": {
      "type": "audio",
      "transcribed": true,
      "transcription_preview": "Ola, gostaria de saber..."
    }
  }
}
```

## Integracao Existente Preservada

| Componente | Status |
|------------|--------|
| `whatsapp-webhook/index.ts` | Intacto |
| `transcribe-audio/index.ts` | Reutilizado (sem alteracoes) |
| `download-media/index.ts` | Nao necessario (Make ja fornece URL) |
| `ai-arya-vendas/index.ts` | Intacto |

## Beneficios

1. **Experiencia Completa**: Clientes podem enviar audios naturalmente
2. **Transcricao Automatica**: Whisper API converte audio em texto
3. **Persistencia**: Todas as midias ficam salvas no banco
4. **Chat UI**: Operadores veem audios e midias normalmente
5. **Zero Impacto**: Integracao direta da Meta nao e afetada

## Plano de Testes

1. Testar com mensagem de texto (deve funcionar como antes)
2. Testar com audio via Make (verificar transcricao)
3. Testar com imagem via Make (verificar salvamento)
4. Verificar Chat UI mostra as midias corretamente
5. Verificar que a integracao direta (whatsapp-webhook) continua funcionando
