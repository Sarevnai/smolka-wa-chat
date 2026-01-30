
# Plano: Migrar Atendimento Humano para Make.com

## Resumo Executivo

Migrar o envio de mensagens dos atendentes humanos (Locação, Administração, Vendas) para passar pelo Make.com, mantendo a API WhatsApp direta apenas para campanhas e empreendimentos.

---

## Arquitetura Atual

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                        │
│                    (MessageComposer.tsx)                                 │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ send-wa-message │  │  send-wa-media  │  │  send-bulk-msgs │
│  (Edge Function)│  │ (Edge Function) │  │  (Campanhas)    │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                               │
                               ▼
                    ┌─────────────────┐
                    │  WhatsApp API   │
                    │   (Meta Graph)  │
                    └─────────────────┘
```

---

## Arquitetura Proposta

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
│  (NOVA Edge Fn) │    │  send-wa-media  │                  │
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

## Componentes a Implementar

### 1. Nova Edge Function: `send-via-make`

| Campo | Descrição |
|-------|-----------|
| Endpoint | `POST /functions/v1/send-via-make` |
| Função | Recebe mensagens do frontend e envia para Make.com |
| Autenticação | JWT do usuário logado (como `send-wa-message`) |

**Payload de entrada (do frontend):**

```typescript
{
  to: string;              // Telefone do destinatário
  text?: string;           // Texto da mensagem
  mediaUrl?: string;       // URL do media (se for arquivo)
  mediaType?: string;      // MIME type
  caption?: string;        // Legenda do arquivo
  filename?: string;       // Nome do arquivo
  conversation_id?: string; // ID da conversa
  attendant_name?: string; // Nome do atendente (para registro)
  department?: string;     // Departamento (locacao, vendas, administrativo)
}
```

**Payload de saída (para Make.com):**

```typescript
{
  action: 'send_message';
  phone: string;
  message?: string;
  media_url?: string;
  media_type?: string;
  caption?: string;
  filename?: string;
  attendant: string;
  department: string;
  conversation_id: string;
  timestamp: string;
}
```

### 2. Novo Webhook no Make.com

O Make.com precisa de um cenário para:
1. Receber o payload de `send-via-make`
2. Verificar `action === 'send_message'`
3. Enviar via HTTP Request para WhatsApp Graph API
4. Responder com sucesso/erro

### 3. Atualização do Frontend

**Arquivo:** `src/hooks/useMediaUpload.ts`

- Nova função: `sendViaMAke()`
- Detectar departamento da conversa
- Rotear para `send-via-make` ao invés de `send-wa-message`/`send-wa-media`

**Arquivo:** `src/components/chat/ChatWindow.tsx`

- Atualizar `sendMessage()` para usar Make quando departamento for: locacao, vendas, administrativo
- Manter envio direto para: marketing (campanhas) e empreendimentos

**Arquivo:** `src/components/chat/MessageComposer.tsx`

- Passar departamento para o hook de envio

---

## Detalhes Técnicos

### Edge Function: `send-via-make/index.ts`

```typescript
// Estrutura básica
serve(async (req) => {
  // 1. Validar autenticação JWT
  // 2. Extrair dados da request
  // 3. Registrar mensagem no banco (direction: 'outbound')
  // 4. Enviar para Make.com webhook
  // 5. Retornar resultado
});
```

**URL do Make.com:** A ser configurada como secret `MAKE_OUTBOUND_WEBHOOK_URL`

### Lógica de Roteamento no Frontend

```typescript
// Em ChatWindow.tsx ou hook dedicado
const shouldUseMake = (departmentCode: string) => {
  return ['locacao', 'vendas', 'administrativo'].includes(departmentCode);
};

const sendMessage = async (text: string) => {
  const department = conversationData?.department_code;
  
  if (shouldUseMake(department)) {
    // Usar send-via-make
    await supabase.functions.invoke('send-via-make', {
      body: { to: phoneNumber, text, department, conversation_id }
    });
  } else {
    // Manter envio direto (campanhas, marketing)
    await fetch(`${SUPABASE_URL}/functions/v1/send-wa-message`, ...);
  }
};
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/send-via-make/index.ts` | **CRIAR** | Nova edge function para enviar via Make |
| `src/hooks/useSendMessage.ts` | **CRIAR** | Hook para centralizar lógica de envio |
| `src/components/chat/ChatWindow.tsx` | **MODIFICAR** | Usar novo hook com roteamento |
| `src/components/chat/MessageComposer.tsx` | **MODIFICAR** | Passar departamento para envio |
| `src/hooks/useMediaUpload.ts` | **MODIFICAR** | Adicionar envio de mídia via Make |
| `supabase/config.toml` | **MODIFICAR** | Adicionar nova função |

---

## Secrets Necessários

| Nome | Descrição |
|------|-----------|
| `MAKE_OUTBOUND_WEBHOOK_URL` | URL do webhook Make.com para envio de mensagens |
| `MAKE_API_KEY` | Já existente - pode ser reutilizado para autenticação |

---

## Fluxo de Mensagens Atualizado

### Atendimento Humano (Locação/Vendas/Admin)

```
1. Atendente digita mensagem no ChatWindow
2. Frontend detecta departamento = 'locacao' (ou vendas/admin)
3. Chama send-via-make com payload
4. Edge function:
   a. Salva mensagem no banco (messages table)
   b. Envia para Make.com webhook
5. Make.com:
   a. Recebe payload com action='send_message'
   b. Envia para WhatsApp Graph API
6. Realtime atualiza interface
```

### Campanhas e Empreendimentos

```
1. Sistema dispara campanha ou atendimento de empreendimento
2. Usa send-wa-message / send-wa-media diretamente
3. WhatsApp API envia mensagem
4. Mensagem registrada no banco
```

---

## Benefícios

1. **Centralização**: Todo atendimento passa pelo Make.com, facilitando monitoramento
2. **Flexibilidade**: Make.com pode adicionar lógica de automação sobre mensagens humanas
3. **Consistência**: Mesmo pipeline para IA e humanos
4. **Rastreabilidade**: Make.com logs disponíveis para auditoria
5. **Escalabilidade**: Make.com pode fazer rate limiting e fila de mensagens

---

## Considerações

1. **Latência**: Adiciona ~200-500ms de latência extra (Make.com processing)
2. **Dependência**: Atendimento humano fica dependente do Make.com
3. **Fallback**: Considerar implementar fallback para API direta se Make falhar
4. **Custo**: Mais operações no Make.com (verificar plano de uso)

---

## Etapas de Implementação

1. Criar secret `MAKE_OUTBOUND_WEBHOOK_URL`
2. Criar edge function `send-via-make`
3. Configurar cenário no Make.com para receber e processar
4. Criar hook `useSendMessage` com lógica de roteamento
5. Atualizar `ChatWindow.tsx` para usar novo hook
6. Atualizar `MessageComposer.tsx` e `useMediaUpload.ts`
7. Testar fluxo completo
8. Deploy e validação
