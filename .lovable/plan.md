
# Correções do Fluxo C2S - Ian Veras

## Problemas Identificados

1. **`contact_id` e `conversation_id` nulos no `c2s_integration`**: Os payloads enviados para `c2s-create-lead` pelo `ai-virtual-agent` e `ai-vendas` nao incluem esses campos, resultando em registros orfaos no banco.

2. **`qualification_status` nao atualizado apos C2S via tool call**: No `ai-virtual-agent`, quando o envio ao C2S ocorre via tool call da IA (linha ~3821), o status de qualificacao permanece `pending` em vez de ser atualizado para `sent_to_crm`. O fluxo determinista (linha ~2226) ja faz isso corretamente.

3. **`ai-vendas` nao atualiza qualificacao nem propaga IDs**: O agente de vendas envia ao C2S sem `contact_id`, `conversation_id`, e nao atualiza a tabela `lead_qualification`.

---

## Plano de Correções

### 1. `ai-virtual-agent/index.ts` - Funcao `sendLeadToC2S` (linha ~1477)

Adicionar `contact_id` e `conversation_id` como parametros da funcao e inclui-los no body enviado para `c2s-create-lead`.

### 2. `ai-virtual-agent/index.ts` - Tool call handler (linha ~3808)

Apos C2S bem-sucedido (linha ~3821):
- Buscar o `lead_qualification` pelo `phone_number`
- Atualizar `qualification_status` para `sent_to_crm` e `sent_to_crm_at`
- Passar `contact_id` e `conversation_id` na chamada a `sendLeadToC2S`

### 3. `ai-vendas/index.ts` - Bloco `enviar_lead_c2s` (linha ~291)

Adicionar `contact_id` e `conversation_id` ao payload do C2S:
- Buscar o contact pelo phone_number
- Usar o `conversationId` ja disponivel no escopo
- Atualizar `lead_qualification` apos transferencia bem-sucedida

### 4. `c2s-create-lead/index.ts` - Sem alteracoes necessarias

A funcao ja aceita e salva `contact_id` e `conversation_id` corretamente. O problema esta nos chamadores que nao enviam esses campos.

---

## Detalhes Tecnicos

### Alteracao em `sendLeadToC2S` (ai-virtual-agent)

```typescript
// Antes
async function sendLeadToC2S(params, phoneNumber, conversationHistory, contactName?)

// Depois  
async function sendLeadToC2S(params, phoneNumber, conversationHistory, contactName?, contactId?, conversationId?)
```

Adicionar ao body: `contact_id: contactId, conversation_id: conversationId`

### Alteracao no tool call handler (ai-virtual-agent, ~3819)

```typescript
const c2sResult = await sendLeadToC2S(
  args, phoneNumber, historyText, currentContactName,
  conversation?.contact_id, conversation?.id
);

if (c2sResult.success) {
  // ... handoff existente ...
  
  // NOVO: Atualizar qualification_status
  await supabase
    .from('lead_qualification')
    .update({ 
      qualification_status: 'sent_to_crm', 
      sent_to_crm_at: new Date().toISOString() 
    })
    .eq('phone_number', phoneNumber);
}
```

### Alteracao no ai-vendas (~293)

```typescript
// Buscar contact_id
const { data: contact } = await supabase
  .from('contacts')
  .select('id')
  .eq('phone', phone_number)
  .maybeSingle();

const c2sPayload = {
  ...existente,
  contact_id: contact?.id || null,
  conversation_id: conversationId || null,
};

// Apos sucesso:
if (!c2sError) {
  c2sTransferred = true;
  await supabase
    .from('lead_qualification')
    .update({ qualification_status: 'sent_to_crm', sent_to_crm_at: new Date().toISOString() })
    .eq('phone_number', phone_number);
}
```

---

## Arquivos Modificados

| Arquivo | Tipo de Alteracao |
|---------|------------------|
| `supabase/functions/ai-virtual-agent/index.ts` | Propagar IDs + atualizar qualification |
| `supabase/functions/ai-vendas/index.ts` | Propagar IDs + atualizar qualification |

Nenhuma migracao de banco necessaria - as colunas `contact_id` e `conversation_id` ja existem na tabela `c2s_integration`.
