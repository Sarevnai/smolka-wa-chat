
# Plano: Integracao Make.com em Paralelo (Coexistencia)

## Visao Geral

Criar uma nova edge function `make-webhook` que funciona em **PARALELO** com o `whatsapp-webhook` existente, permitindo dois numeros de WhatsApp simultaneos:

- **Numero 1 (Atual)**: Conexao direta com a API da Meta via `whatsapp-webhook` - **NAO SERA ALTERADO**
- **Numero 2 (Novo - Aimee)**: Integracao via Make via `make-webhook`

## Analise do Blueprint Make.com

Analisando o arquivo `Integration_WhatsApp_Business_Cloud.blueprint_2.json`:

```text
FLUXO DO MAKE:
┌────────────────────────────────────────────────────────────────────────┐
│  Modulo 1: watchEvents2                                                 │
│  Webhook "Aimee" recebe mensagens do WhatsApp                          │
│  Dados disponiveis:                                                     │
│  - messages[].from (telefone do remetente)                             │
│  - messages[].id (wa_message_id)                                       │
│  - messages[].text.body (texto da mensagem)                            │
│  - messages[].timestamp                                                │
│  - contacts[].profile.name (nome do perfil)                            │
│  - contacts[].wa_id                                                    │
│  - metadata.phone_number_id                                            │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Modulo 10: OpenAI (SERA SUBSTITUIDO)                                  │
│  Atualmente usa OpenAI direto                                          │
│  → Sera substituido por HTTP Request para Lovable                      │
└────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Modulo 11: sendMessage                                                │
│  Envia resposta via WhatsApp Business Cloud                            │
│  - to: {{1.contacts[].wa_id}}                                          │
│  - text.body: {{10.result}} ← resposta da IA                          │
│  - fromId: 1002870269574542 (Helena Smolka +55 48 9163-1011)          │
└────────────────────────────────────────────────────────────────────────┘
```

## Arquitetura de Coexistencia

```text
NUMERO 1 - Conexao Direta (NAO ALTERADO)
┌──────────────┐    ┌────────────────────┐    ┌──────────────────────┐
│  WhatsApp    │───▶│  whatsapp-webhook  │───▶│  Agentes IA          │
│  (Meta API)  │    │  (atual - intacto) │    │  (Helena/Nina/etc)   │
└──────────────┘    └────────────────────┘    └──────────────────────┘
                             │                          │
                             ▼                          ▼
                    ┌────────────────────┐    ┌──────────────────────┐
                    │  send-wa-message   │◀───│  Resposta direta     │
                    │  (API Meta)        │    │  via API Meta        │
                    └────────────────────┘    └──────────────────────┘


NUMERO 2 - Via Make (NOVO - Aimee)
┌──────────────┐    ┌───────┐    ┌────────────────┐    ┌──────────────┐
│  WhatsApp    │───▶│ Make  │───▶│  make-webhook  │───▶│  Agentes IA  │
│  (Aimee)     │    │       │    │  (NOVO)        │    │  (mesmos)    │
└──────────────┘    └───────┘    └────────────────┘    └──────────────┘
                                         │                    │
                                         ▼                    ▼
                                ┌────────────────┐    ┌──────────────┐
                                │ Retorna JSON   │◀───│  Resposta IA │
                                │ para Make      │    │  (texto)     │
                                └────────────────┘    └──────────────┘
                                         │
                                         ▼
                    ┌───────┐    ┌──────────────┐
                    │ Make  │───▶│  WhatsApp    │
                    │       │    │  (Aimee)     │
                    └───────┘    └──────────────┘
```

## Nova Edge Function: make-webhook/index.ts

### Endpoint

```
POST https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/make-webhook
```

### Autenticacao

- Header `x-make-api-key` validado contra secret `MAKE_API_KEY` (ja configurado)

### Request (Make envia)

```json
{
  "phone": "5548991109003",
  "message": "Ola, tenho interesse no Villa Maggiore",
  "contact_name": "Joao Silva",
  "message_id": "wamid.xxx",
  "timestamp": "1737914400",
  "message_type": "text"
}
```

Mapeamento no Make:
- `phone`: `{{1.messages[].from}}`
- `message`: `{{1.messages[].text.body}}`
- `contact_name`: `{{1.contacts[].profile.name}}`
- `message_id`: `{{1.messages[].id}}`
- `timestamp`: `{{1.messages[].timestamp}}`

### Response (Lovable retorna)

```json
{
  "success": true,
  "result": "Ola Joao! Que bom seu interesse no Villa Maggiore...",
  "phone": "5548991109003",
  "agent": "helena",
  "conversation_id": "uuid-xxx",
  "metadata": {
    "development_detected": "Villa Maggiore",
    "c2s_transferred": false,
    "contact_name": "Joao Silva"
  }
}
```

**Importante**: O campo `result` sera usado pelo Make no modulo 11: `{{X.result}}` onde X eh o numero do modulo HTTP.

### Fluxo Interno da Edge Function

```text
1. Validar x-make-api-key header
         │
         ▼
2. Normalizar telefone (remover caracteres especiais)
         │
         ▼
3. Salvar mensagem INBOUND no banco
   (tabela: messages, direction: 'inbound')
         │
         ▼
4. Encontrar/criar conversa
   (reutiliza logica do whatsapp-webhook)
         │
         ▼
5. Detectar agente correto:
   ┌─────────────────────────────────────────────────────────────┐
   │  a) portal_leads_log com development_id → ai-arya-vendas   │
   │  b) Mencao de empreendimento no texto  → ai-arya-vendas    │
   │  c) Campanha marketing ativa           → ai-marketing-agent│
   │  d) Default                            → ai-virtual-agent  │
   └─────────────────────────────────────────────────────────────┘
         │
         ▼
6. Chamar agente de IA internamente
   (supabase.functions.invoke - NAO usa WhatsApp API)
         │
         ▼
7. Salvar resposta OUTBOUND no banco
   (tabela: messages, direction: 'outbound')
         │
         ▼
8. Retornar JSON com "result" para Make enviar
```

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/make-webhook/index.ts` | **Criar** | Nova edge function |
| `supabase/config.toml` | **Modificar** | Adicionar config |

## Detalhes Tecnicos

### Funcoes Reutilizadas do whatsapp-webhook

A nova function tera funcoes similares inline (copiadas e adaptadas) para manter independencia:

- `normalizePhoneNumber()` - Normalizar telefone
- `getPhoneVariations()` - Variacoes com/sem 9o digito
- `findOrCreateConversation()` - Gerenciar conversas
- `checkDevelopmentLead()` - Detectar leads de empreendimento
- `detectDevelopmentFromMessage()` - Detectar mencoes no texto
- `checkMarketingCampaignSource()` - Verificar campanhas

### Chamada dos Agentes de IA (sem envio WhatsApp)

A diferenca principal: os agentes serao chamados mas a resposta NAO sera enviada via WhatsApp dentro da function. Sera retornada ao Make.

```typescript
// Para leads de empreendimentos
const { data: aryaResult } = await supabase.functions.invoke('ai-arya-vendas', {
  body: {
    phone_number: phoneNumber,
    message: messageBody,
    development_id: development.development_id,
    conversation_history: history,
    contact_name: contactName,
    skip_whatsapp_send: true  // Flag para NAO enviar via WhatsApp
  }
});

// Retornar resposta ao Make
return new Response(JSON.stringify({
  success: true,
  result: aryaResult.response,
  agent: 'helena'
}));
```

### Adaptacao dos Agentes Existentes

Os agentes atuais enviam mensagens diretamente via WhatsApp API. Para a integracao Make, eles precisam de uma flag `skip_whatsapp_send`:

**Opcao A (Preferida)**: Processar a logica de IA no `make-webhook` sem chamar os agentes que enviam mensagens, apenas extraindo e reutilizando a logica de:
- Carregar contexto do empreendimento
- Chamar OpenAI com o prompt correto
- Retornar resposta

**Opcao B**: Modificar os agentes para aceitar `skip_whatsapp_send` e retornar apenas a resposta.

### Persistencia de Mensagens

```typescript
// Salvar mensagem inbound
await supabase.from('messages').insert({
  wa_message_id: request.message_id || `make_${Date.now()}`,
  wa_from: phoneNumber,
  wa_to: null,
  direction: 'inbound',
  body: messageBody,
  conversation_id: conversationId,
  wa_timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
  department_code: 'vendas'
});

// Salvar resposta outbound (antes de retornar ao Make)
await supabase.from('messages').insert({
  wa_message_id: `make_out_${Date.now()}`,
  wa_from: null,
  wa_to: phoneNumber,
  direction: 'outbound',
  body: aiResponse,
  conversation_id: conversationId,
  wa_timestamp: new Date().toISOString(),
  department_code: 'vendas'
});
```

## Configuracao do config.toml

```toml
[functions.make-webhook]
verify_jwt = false
```

## Configuracao no Make

### Substituir Modulo OpenAI por HTTP Request

**Method:** POST

**URL:** 
```
https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/make-webhook
```

**Headers:**
```
Content-Type: application/json
x-make-api-key: [valor do secret MAKE_API_KEY]
```

**Body (JSON):**
```json
{
  "phone": "{{1.messages[].from}}",
  "message": "{{1.messages[].text.body}}",
  "contact_name": "{{1.contacts[].profile.name}}",
  "message_id": "{{1.messages[].id}}",
  "timestamp": "{{1.messages[].timestamp}}",
  "message_type": "{{1.messages[].type}}"
}
```

### Modulo sendMessage

Atualizar o campo `text.body` para:
```
{{X.result}}
```
Onde X eh o numero do novo modulo HTTP Request.

## O Que NAO Sera Alterado

| Arquivo | Status |
|---------|--------|
| `whatsapp-webhook/index.ts` | Intacto |
| `ai-arya-vendas/index.ts` | Intacto (logica sera replicada) |
| `ai-virtual-agent/index.ts` | Intacto |
| `ai-marketing-agent/index.ts` | Intacto |
| `send-wa-message/index.ts` | Intacto |

## Beneficios

1. **Coexistencia Real**: Dois numeros funcionando simultaneamente
2. **Zero Risco**: Integracao atual permanece 100% intacta
3. **Banco Unificado**: Todas as mensagens no mesmo banco de dados
4. **Chat UI Funcional**: Operadores veem conversas de ambos os numeros
5. **Mesma Logica IA**: Helena Smolka responde igual nos dois canais
6. **Facil Rollback**: Se precisar desativar Make, basta parar o cenario

## Plano de Testes

```text
1. Deploy da nova edge function
         │
         ▼
2. Testar endpoint diretamente:
   curl -X POST https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/make-webhook \
     -H "Content-Type: application/json" \
     -H "x-make-api-key: [API_KEY]" \
     -d '{"phone":"5548999999999","message":"Teste","contact_name":"Teste"}'
         │
         ▼
3. Verificar logs da edge function
         │
         ▼
4. Verificar no Chat UI se mensagem aparece
         │
         ▼
5. Configurar modulo HTTP no Make
         │
         ▼
6. Testar fluxo completo via WhatsApp numero Aimee
```
