
# Correção: Filtrar Status Callbacks no Make.com

## Diagnóstico Confirmado

O Supabase está funcionando corretamente. Os logs mostram:

| Hora | Tipo | Resultado |
|------|------|-----------|
| 20:20:35 | Mensagem real | ✅ Processada com `Props: 2` |
| 20:20:48 | Status callback | ⚠️ `skipped: true` |
| 20:20:49 | Status callback | ⚠️ `skipped: true` |

O WhatsApp envia **status callbacks** (confirmação de entrega/leitura) que chegam APÓS a mensagem real. Você está vendo apenas o último evento (o callback vazio).

## Causa Raiz

O Make.com está enviando TODOS os eventos do WhatsApp para o Supabase, incluindo:
- `messages[]` → Mensagens reais (devem ser processadas)
- `statuses[]` → Callbacks de status (devem ser ignorados)

## Correção no Make.com

### Passo 1: Adicionar Filtro Após o Webhook

Entre o **Módulo 1** (Watch Events) e o **Módulo 14** (HTTP Request):

1. Clique na linha de conexão entre os módulos
2. Adicione um **Filtro**
3. Configure:
   - **Label**: "Apenas mensagens reais"
   - **Condition**: 
     ```
     {{1.messages[]}} exists
     AND
     {{length(1.messages[])}} > 0
     ```

### Passo 2: Verificar o Data Inspector

No Make.com:
1. Abra o **History** do cenário
2. Veja as execuções separadas
3. Confirme que execuções com mensagens reais retornam `properties[]`

### Fluxo Corrigido

```text
[WhatsApp Webhook]
       │
       ├─ statuses[] → ❌ FILTRADO (não passa)
       │
       └─ messages[] → ✅ Passa para HTTP Request
                              │
                              ▼
                       [Supabase make-webhook]
                              │
                              ▼
                       { properties: [...] }
```

## Por Que Isso Acontece

O WhatsApp Business API envia eventos de status como:
- `sent` → Mensagem enviada
- `delivered` → Mensagem entregue
- `read` → Mensagem lida

Esses eventos têm estrutura diferente (sem `messages[]`, apenas `statuses[]`). O código do Supabase já trata isso:

```typescript
// Linha 1542 do make-webhook
if (!phone && !message && !media_url) {
  console.log('📌 Ignoring status callback');
  return { success: true, skipped: true, reason: 'status_callback' };
}
```

A correção no Make evita chamadas desnecessárias ao Supabase.

## Resumo

| O Que | Status |
|-------|--------|
| Supabase retorna `properties[]` | ✅ Funcionando |
| Make processa mensagens reais | ⚠️ Precisa filtro |
| Make filtra status callbacks | ❌ Não configurado |

Após adicionar o filtro, o Make só processará mensagens reais e você verá o `data.properties` corretamente.
