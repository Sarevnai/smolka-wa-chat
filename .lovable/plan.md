

# Correção: Erro na Segunda Mensagem do Make Webhook

## Problema Identificado

Os logs revelam que o Make está enviando **duas requisições** para cada mensagem:

1. **Requisição válida** (funciona):
   - `Phone: 554888182882, Type: text, Message: "olá..."`
   - Processada com sucesso

2. **Requisição de callback** (falha):
   - `Phone: , Type: text, Message: "[media]..."`
   - Retorna 400: "Missing required fields"

O Make.com provavelmente está configurado para enviar webhooks para múltiplos eventos (mensagem recebida, delivery status, read status, etc.), e os eventos de status não incluem os campos obrigatórios.

## Solução

Modificar o `make-webhook` para:
1. Detectar e ignorar requisições de callback/status silenciosamente
2. Retornar 200 OK para requisições sem dados válidos (em vez de 400)
3. Adicionar logging detalhado do payload para debug

## Alterações Técnicas

### Arquivo: `supabase/functions/make-webhook/index.ts`

**Linha 859-944: Adicionar tratamento para callbacks vazios**

```typescript
// Parse request body
const body: MakeWebhookRequest = await req.json();

// Debug: log raw payload for analysis
console.log('📦 Raw payload keys:', Object.keys(body).join(', '));

const { 
  phone, 
  message, 
  // ... outros campos
} = body;

// Check if this is a status callback (no phone = likely delivery/read notification)
if (!phone && !message) {
  console.log('📌 Ignoring status callback (no phone/message)');
  return new Response(
    JSON.stringify({ success: true, skipped: true, reason: 'status_callback' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Original validation - only fail if we have partial data
if (!phone || (!message && !media_url)) {
  console.warn('⚠️ Incomplete payload:', { phone: !!phone, message: !!message, media_url: !!media_url });
  return new Response(
    JSON.stringify({ success: false, error: 'Missing required fields: phone and (message or media_url)' }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────────┐
│                    MAKE WEBHOOK REQUEST                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   Tem phone E message?      │
              └──────────────┬──────────────┘
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
               ┌────────┐        ┌────────────────────┐
               │  SIM   │        │  NÃO (callback)    │
               └────┬───┘        └─────────┬──────────┘
                    │                      │
                    ▼                      ▼
           ┌────────────────┐    ┌────────────────────┐
           │ Processar      │    │ Return 200 OK      │
           │ mensagem       │    │ (skipped: true)    │
           │ normalmente    │    └────────────────────┘
           └────────────────┘
```

## Implementação

1. Adicionar log do payload bruto para identificar a estrutura exata dos callbacks
2. Detectar e ignorar requisições de status/callback com resposta 200
3. Manter a validação rigorosa apenas para mensagens reais

## Resultado Esperado

- Primeira mensagem: processada normalmente
- Callbacks de status: ignorados silenciosamente (200 OK)
- Sem mais erros "Missing required fields"
- Fluxo de triagem continua funcionando

