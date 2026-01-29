

# Plano: Corrigir Erros e Adicionar Disparo para Webhook Externo

## Parte 1: Correção de Erros de Build

Antes de implementar o disparo, preciso corrigir o erro de tipo na edge function `make-webhook`:

### Arquivo: `supabase/functions/make-webhook/index.ts`

**Linha 1917-1929** - Corrigir erro `'error' is of type 'unknown'`:

```typescript
// ANTES (linha 1923):
error: error.message || 'Internal server error',

// DEPOIS:
const errorMessage = error instanceof Error ? error.message : 'Internal server error';
error: errorMessage,
```

---

## Parte 2: Adicionar Disparo para Webhook Externo

### Localização no código

Inserir o bloco de disparo **antes do return final** (aproximadamente linha 1895, antes de `} catch (error)`).

### Código a adicionar

```typescript
// ========================================
// DISPARO PARA WEBHOOK EXTERNO (Make.com)
// ========================================
const externalWebhookUrl = 'https://hook.us2.make.com/crfpetpkyvxwn1lrhq2aqmmbjvgnhhl3';

const webhookPayload = {
  phone: phoneNumber,
  result: aiResponse,
  properties: propertiesToSend.length > 0 ? propertiesToSend.map(p => ({
    codigo: p.codigo,
    foto_destaque: p.foto_destaque,
    tipo: p.tipo,
    bairro: p.bairro,
    cidade: p.cidade || 'Florianópolis',
    quartos: String(p.quartos || ''),
    suites: String(p.suites || ''),
    vagas: String(p.vagas || ''),
    area_util: String(p.area_util || ''),
    preco: p.preco || 0,
    preco_formatado: p.preco_formatado || '',
    valor_condominio: p.valor_condominio || 0,
    endereco: p.endereco || '',
    link: p.link || '',
    caracteristicas: p.caracteristicas || []
  })) : [],
  audio: audioResult ? {
    url: audioResult.audioUrl,
    type: audioResult.contentType,
    is_voice_message: audioResult.isVoiceMessage
  } : null,
  conversation_id: conversationId,
  department: currentDepartment,
  contact_name: existingName || null
};

// Dispara de forma assíncrona (não bloqueia o retorno)
try {
  console.log('📤 Dispatching to external Make.com webhook...');
  console.log('📦 Payload:', JSON.stringify(webhookPayload, null, 2));
  
  const webhookResponse = await fetch(externalWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  });
  
  const responseText = await webhookResponse.text();
  console.log(`✅ External webhook response: ${webhookResponse.status} - ${responseText}`);
} catch (webhookError) {
  console.error('⚠️ External webhook dispatch failed:', webhookError);
  // Não bloqueia o fluxo principal - apenas loga o erro
}
```

---

## Parte 3: Posição Exata no Código

O código deve ser inserido **após** salvar a mensagem outbound no banco (aproximadamente linha 1850-1860) e **antes** do return final (linha ~1895).

Procurar por este trecho no código:

```typescript
// Após este bloco:
console.log(`✅ AI response saved with ID: ${outboundData.id}`);

// Inserir o bloco de disparo AQUI

// Antes deste return:
return new Response(
  JSON.stringify({
    success: true,
    result: aiResponse,
    ...
```

---

## Fluxo Resultante

```text
┌─────────────────────────────────────────────────────────────────┐
│                     FLUXO COMPLETO                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [Cliente envia mensagem no WhatsApp]                         │
│                    │                                            │
│                    ▼                                            │
│   [Make.com Cenário 1] ──────► [make-webhook Supabase]         │
│                                         │                       │
│                    ┌────────────────────┼────────────────────┐  │
│                    │                    │                    │  │
│                    ▼                    ▼                    ▼  │
│              [Processa IA]      [Busca imóveis]     [Gera áudio]│
│                    │                    │                    │  │
│                    └────────────────────┴────────────────────┘  │
│                                         │                       │
│                    ┌────────────────────┴────────────────────┐  │
│                    │                                         │  │
│                    ▼                                         ▼  │
│         [Salva no banco DB]              [POST para webhook]    │
│         [Atualiza conversa]              [hook.us2.make.com/...]│
│                    │                                         │  │
│                    ▼                                         ▼  │
│         [Plataforma Lovable]             [Make.com Cenário 2]   │
│         [vê todo o contexto]             [Envia via WhatsApp]   │
│                                                              │  │
│                                                              ▼  │
│                                          [Cliente recebe msg]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Payload que o Make.com Receberá

```json
{
  "phone": "5548991234567",
  "result": "Olá! Encontrei 2 imóveis perfeitos para você! 🏠",
  "properties": [
    {
      "codigo": "14593",
      "foto_destaque": "https://cdn.vistahost.com.br/.../foto.jpg",
      "tipo": "Apartamento",
      "bairro": "Centro",
      "cidade": "Florianópolis",
      "quartos": "2",
      "suites": "1",
      "vagas": "2",
      "area_util": "80",
      "preco": 6500,
      "preco_formatado": "R$ 6.500/mês",
      "valor_condominio": 1171.33,
      "endereco": "Rua Duarte Schutel",
      "link": "https://smolkaimoveis.com.br/imovel/14593",
      "caracteristicas": ["2 dormitórios", "2 vagas"]
    }
  ],
  "audio": null,
  "conversation_id": "uuid...",
  "department": "locacao",
  "contact_name": "Ian Veras"
}
```

---

## Mapeamento para o Make.com (Cenário 2)

| Campo do Payload | Uso no Make.com |
|-----------------|-----------------|
| `phone` | To (número do destinatário) |
| `result` | Body da mensagem de texto |
| `properties` | Array para Iterator |
| `properties[].foto_destaque` | Media URL da imagem |
| `properties[].tipo` | Tipo do imóvel (caption) |
| `properties[].bairro` | Bairro (caption) |
| `properties[].quartos` | Quartos (caption) |
| `properties[].preco_formatado` | Preço (caption) |
| `properties[].link` | Link do imóvel (caption) |
| `audio.url` | URL do áudio (se existir) |
| `contact_name` | Nome do contato |

---

## Resumo das Ações

1. Corrigir erro de tipo na linha 1923 do `make-webhook`
2. Adicionar bloco de disparo para webhook externo antes do return
3. Deploy automático da edge function
4. Testar enviando mensagem real pelo WhatsApp
5. Verificar nos logs se o disparo foi feito
6. Configurar Cenário 2 no Make.com para processar o payload

