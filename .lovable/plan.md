
# Plano: Disparar Dados para Webhook Externo do Make.com

## Objetivo
Adicionar um disparo HTTP para o webhook `https://hook.us2.make.com/crfpetpkyvxwn1lrhq2aqmmbjvgnhhl3` com os dados processados pelo `make-webhook`, permitindo que o Make.com envie as mensagens via módulo nativo do WhatsApp enquanto a plataforma mantém o registro completo da conversa.

## Fluxo Proposto

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     FLUXO ATUALIZADO                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   [Make.com] → [make-webhook Supabase]                                  │
│                        │                                                │
│                        ▼                                                │
│              ┌─────────────────────┐                                    │
│              │  Processa mensagem  │                                    │
│              │  Busca imóveis      │                                    │
│              │  Gera resposta IA   │                                    │
│              └─────────────────────┘                                    │
│                        │                                                │
│          ┌─────────────┴─────────────┐                                  │
│          ▼                           ▼                                  │
│   ┌─────────────────┐     ┌─────────────────────────────┐              │
│   │ Salva mensagens │     │ Dispara para webhook externo│              │
│   │ no banco (DB)   │     │ hook.us2.make.com/...       │              │
│   └─────────────────┘     └─────────────────────────────┘              │
│          │                           │                                  │
│          ▼                           ▼                                  │
│   [Plataforma Lovable]     [Make.com → WhatsApp Nativo]                │
│   (vê todo o contexto)     (envia p/ cliente real)                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Payload Enviado para o Webhook Externo

```json
{
  "phone": "5548991234567",
  "result": "Encontrei 3 imóveis perfeitos para você!",
  "properties": [
    {
      "codigo": "1234",
      "foto_destaque": "https://...",
      "tipo": "Apartamento",
      "bairro": "Centro",
      "quartos": "2",
      "preco_formatado": "R$ 2.500",
      "link": "https://..."
    }
  ],
  "audio": { "url": "...", "type": "audio/mpeg" },
  "conversation_id": "uuid..."
}
```

## Alteracoes Tecnicas

### Arquivo: `supabase/functions/make-webhook/index.ts`

1. **Adicionar funcao de disparo para webhook externo** (antes do return final, linha ~1879):

```typescript
// Dispara para webhook externo do Make.com para envio via WhatsApp nativo
const externalWebhookUrl = 'https://hook.us2.make.com/crfpetpkyvxwn1lrhq2aqmmbjvgnhhl3';

const webhookPayload = {
  phone: phoneNumber,
  result: aiResponse,
  properties: propertiesToSend.length > 0 ? propertiesToSend.map(p => ({
    codigo: p.codigo,
    foto_destaque: p.foto_destaque,
    tipo: p.tipo,
    bairro: p.bairro,
    quartos: p.quartos,
    preco_formatado: p.preco_formatado,
    link: p.link
  })) : undefined,
  audio: audioResult ? {
    url: audioResult.audioUrl,
    type: audioResult.contentType,
    is_voice_message: audioResult.isVoiceMessage
  } : undefined,
  conversation_id: conversationId,
  department: currentDepartment,
  contact_name: existingName || null
};

try {
  console.log('📤 Dispatching to external webhook...');
  const webhookResponse = await fetch(externalWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  });
  console.log(`✅ External webhook response: ${webhookResponse.status}`);
} catch (webhookError) {
  console.error('⚠️ External webhook dispatch failed:', webhookError);
  // Nao bloqueia o fluxo principal
}
```

2. **Posicao no codigo**: Inserir apos salvar a mensagem no banco (linha 1847) e antes do return (linha 1879)

## Configuracao no Make.com (Segundo Cenario)

O webhook externo (`hook.us2.make.com/...`) deve ter a seguinte estrutura:

```text
[Webhook] → [Router]
               │
     ┌─────────┴─────────┐
     │                   │
[Tem properties?]   [Sem properties]
     │                   │
     ▼                   ▼
[Iterator]          [WhatsApp: Send Text]
{{properties}}      {{result}}
     │
     ▼
[WhatsApp: Send Image]
• Media URL: {{foto_destaque}}
• Caption: formatado
• To: {{phone}}
```

## Beneficios

| Aspecto | Resultado |
|---------|-----------|
| Plataforma Lovable | Ve todas as mensagens (inbound + outbound) |
| Cliente WhatsApp | Recebe imagens e texto via modulo nativo |
| Janela 24h | Contornada pelo modulo nativo do Make.com |
| Rastreabilidade | 100% das interacoes registradas no banco |

## Resumo das Acoes

1. Editar `supabase/functions/make-webhook/index.ts`
2. Adicionar fetch para o webhook externo com o payload completo
3. Configurar segundo cenario no Make.com para receber e enviar via WhatsApp nativo
4. Testar fluxo completo: mensagem do cliente → resposta aparece na plataforma E chega no WhatsApp
