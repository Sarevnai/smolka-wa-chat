

# Plano: Atualizar Secret e Testar Envio de Mensagem

## Resumo

Atualizar o secret `MAKE_OUTBOUND_WEBHOOK_URL` com a nova URL do webhook Make.com e testar o fluxo completo de envio de mensagem pelo chat.

---

## Etapas

### 1. Atualizar Secret

| Campo | Valor |
|-------|-------|
| Nome | `MAKE_OUTBOUND_WEBHOOK_URL` |
| Novo Valor | `https://hook.us2.make.com/crfpetpkyvxwn1lrhq2aqmmbjvgnhhl3` |

### 2. Testar Envio de Mensagem

Usar a conversa atual (`2873bdec-0fad-4a73-85c3-a089031206fd`) para enviar uma mensagem de teste e verificar:

1. A mensagem e registrada na tabela `messages`
2. O payload chega ao webhook do Make.com
3. Os logs da edge function `send-via-make` mostram sucesso

### 3. Verificar Logs

Apos o teste, consultar os logs da edge function para confirmar o fluxo.

---

## Secao Tecnica

### Payload Esperado no Make.com

```json
{
  "action": "send_message",
  "phone": "5548999999999",
  "message": "Mensagem de teste",
  "media_url": null,
  "media_type": null,
  "caption": null,
  "filename": null,
  "attendant": "Nome do Atendente",
  "department": "locacao",
  "conversation_id": "2873bdec-0fad-4a73-85c3-a089031206fd",
  "message_id": 12345,
  "timestamp": "2025-02-02T12:00:00.000Z"
}
```

### Verificacoes de Sucesso

- [ ] Secret atualizado com nova URL
- [ ] Mensagem inserida na tabela `messages`
- [ ] Make.com recebe o webhook
- [ ] Logs mostram `Make.com response` com sucesso

