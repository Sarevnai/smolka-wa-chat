# Plano: Migrar Atendimento Humano para Make.com

## Status: ✅ IMPLEMENTADO

---

## Resumo

Mensagens dos atendentes humanos (Locação, Administração, Vendas) agora são roteadas via Make.com, mantendo a API WhatsApp direta apenas para campanhas e empreendimentos.

---

## Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                        │
│                    (MessageComposer.tsx)                                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
      ┌────────────────────────┼────────────────────────────┐
      │ (Atendimento)          │ (Campanhas/Empreendimentos)│
      ▼                        ▼                            │
┌─────────────────┐    ┌─────────────────┐                  │
│ send-via-make   │    │  send-wa-message│                  │
│  (Edge Function)│    │  send-wa-media  │                  │
└────────┬────────┘    │  (MANTIDOS)     │                  │
         │             └────────┬────────┘                  │
         ▼                      │                           │
┌─────────────────┐             │                           │
│   MAKE.COM      │             └───────────────────────────┤
│  (cenário)      │                                         │
└────────┬────────┘                                         │
         │                                                  │
         └──────────────────────┬───────────────────────────┘
                               ▼
                    ┌─────────────────┐
                    │  WhatsApp API   │
                    │   (Meta Graph)  │
                    └─────────────────┘
```

---

## Componentes Implementados

### 1. Edge Function: `send-via-make` ✅

| Campo | Valor |
|-------|-------|
| Arquivo | `supabase/functions/send-via-make/index.ts` |
| JWT | `verify_jwt = false` (valida manualmente) |
| Secret | `MAKE_OUTBOUND_WEBHOOK_URL` |

**Funcionalidades:**
- Valida JWT do usuário logado
- Insere mensagem no banco de dados (direction: 'outbound')
- Envia payload para webhook do Make.com
- Atualiza `last_message_at` da conversa

**Payload enviado para Make.com:**
```json
{
  "action": "send_message",
  "phone": "5548999999999",
  "message": "Texto da mensagem",
  "media_url": null,
  "media_type": null,
  "caption": null,
  "filename": null,
  "attendant": "Nome do Atendente",
  "department": "locacao",
  "conversation_id": "uuid",
  "message_id": 12345,
  "timestamp": "2025-01-30T12:00:00.000Z"
}
```

### 2. Hook: `useSendMessage` ✅

| Campo | Valor |
|-------|-------|
| Arquivo | `src/hooks/useSendMessage.ts` |

**Funcionalidades:**
- `shouldUseMake(departmentCode)` - Determina se usa Make ou API direta
- `sendTextMessage(options)` - Envia texto com roteamento automático
- `sendMediaMessage(options)` - Envia mídia com roteamento automático

**Roteamento:**
- Make.com → `locacao`, `vendas`, `administrativo`
- API Direta → `marketing`, `empreendimentos`, `null`

### 3. Atualizações no Frontend ✅

**ChatWindow.tsx:**
- Usa `useSendMessage` hook para roteamento
- Passa `departmentCode` para MessageComposer
- `sendMessage()` agora recebe `attendantName` opcional

**MessageComposer.tsx:**
- Nova prop `onSendMedia` para mídia com roteamento
- Nova prop `departmentCode` para contexto
- `onSendMessage` agora recebe `attendantName`

---

## Configuração Necessária no Make.com

Criar um cenário que:

1. **Webhook** - Recebe POST do Supabase
2. **Router** - Filtra por `action === 'send_message'`
3. **HTTP Request** - Envia para WhatsApp Graph API:
   - Se `media_url`: Enviar mídia com caption
   - Se `message`: Enviar texto

**Exemplo de resposta esperada:**
```json
{
  "success": true,
  "wa_message_id": "wamid.xxx"
}
```

---

## Arquivos Modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/send-via-make/index.ts` | ✅ Criado |
| `src/hooks/useSendMessage.ts` | ✅ Criado |
| `src/components/chat/ChatWindow.tsx` | ✅ Modificado |
| `src/components/chat/MessageComposer.tsx` | ✅ Modificado |
| `supabase/config.toml` | ✅ Modificado |

---

## Próximos Passos

1. [x] ~~Adicionar secret `MAKE_OUTBOUND_WEBHOOK_URL`~~ ✅
2. [x] ~~Criar edge function `send-via-make`~~ ✅
3. [x] ~~Criar hook `useSendMessage`~~ ✅
4. [x] ~~Atualizar `ChatWindow.tsx`~~ ✅
5. [x] ~~Atualizar `MessageComposer.tsx`~~ ✅
6. [ ] **Configurar cenário no Make.com** (pendente - requer ação do usuário)
7. [ ] Testar fluxo completo

---

## Testes Recomendados

1. Enviar mensagem de texto em conversa de Locação → deve ir via Make
2. Enviar imagem em conversa de Vendas → deve ir via Make
3. Enviar mensagem em conversa de Marketing → deve ir via API direta
4. Verificar logs no Supabase Edge Functions
5. Verificar histórico de execuções no Make.com
