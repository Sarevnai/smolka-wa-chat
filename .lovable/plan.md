

# Correção: Erro `.catch is not a function` no make-webhook

## Problema Identificado

Na **linha 680** do arquivo `supabase/functions/make-webhook/index.ts`, o código tenta usar `.catch()` em uma operação de insert do Supabase:

```typescript
await supabase.from('activity_logs').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  action_type: 'make_webhook_processed',
  // ...
}).catch(console.error);  // ❌ ERRO!
```

O cliente Supabase não retorna uma Promise tradicional - ele retorna um objeto `{ data, error }`. Por isso, `.catch()` não é uma função válida.

## Solução

Substituir o `.catch(console.error)` pela forma correta de tratamento de erro do Supabase:

```typescript
const { error: logError } = await supabase.from('activity_logs').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  action_type: 'make_webhook_processed',
  target_table: 'messages',
  target_id: phoneNumber,
  metadata: {
    agent,
    development_detected: developmentDetected,
    c2s_transferred: c2sTransferred,
    conversation_id: conversationId,
    message_preview: message.substring(0, 100)
  }
});

if (logError) {
  console.error('❌ Error logging activity:', logError);
}
```

## Arquivo a Modificar

| Arquivo | Ação | Linhas |
|---------|------|--------|
| `supabase/functions/make-webhook/index.ts` | Modificar | 667-680 |

## Mudança Específica

Substituir as linhas 667-680 de:

```typescript
// Log the interaction
await supabase.from('activity_logs').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  action_type: 'make_webhook_processed',
  target_table: 'messages',
  target_id: phoneNumber,
  metadata: {
    agent,
    development_detected: developmentDetected,
    c2s_transferred: c2sTransferred,
    conversation_id: conversationId,
    message_preview: message.substring(0, 100)
  }
}).catch(console.error);
```

Para:

```typescript
// Log the interaction
const { error: logError } = await supabase.from('activity_logs').insert({
  user_id: '00000000-0000-0000-0000-000000000000',
  action_type: 'make_webhook_processed',
  target_table: 'messages',
  target_id: phoneNumber,
  metadata: {
    agent,
    development_detected: developmentDetected,
    c2s_transferred: c2sTransferred,
    conversation_id: conversationId,
    message_preview: message.substring(0, 100)
  }
});

if (logError) {
  console.error('❌ Error logging activity:', logError);
}
```

## Impacto

- **Zero impacto** na integração existente (whatsapp-webhook)
- A função `make-webhook` funcionará corretamente
- O log de atividades será registrado com tratamento de erro adequado
- A resposta será retornada corretamente para o Make.com

