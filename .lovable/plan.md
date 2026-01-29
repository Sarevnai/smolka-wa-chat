
# Plano: Registrar Mensagens do Make.com na Plataforma

## Problema Identificado
O Make.com está enviando as fotos dos imóveis diretamente via módulo nativo do WhatsApp, mas essas mensagens **não estão sendo registradas no banco de dados**. Por isso, vocês não veem o contexto das imagens enviadas na plataforma.

## Solução
Substituir o módulo nativo "WhatsApp > Send an Image" por um **HTTP Request** que chama a edge function `send-wa-media` do Supabase. Essa função:
1. Envia a imagem via WhatsApp API
2. **Salva a mensagem no banco de dados**
3. **Vincula automaticamente à conversa correta**

---

## Configuração no Make.com

### Passo 1: Remover o Módulo "Send an Image"
- Delete o módulo nativo do WhatsApp que está dentro do Iterator

### Passo 2: Adicionar HTTP Request (dentro do Iterator)
No lugar do módulo removido, adicione um novo **HTTP > Make a request**

#### Configurações:
| Campo | Valor |
|-------|-------|
| **URL** | `https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/send-wa-media` |
| **Method** | POST |
| **Headers** | `Content-Type: application/json`<br>`Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwanhzZ3h4aG9nemtrdXpueWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3NjcsImV4cCI6MjA3MzAyNTc2N30.tTbVFi-CkgJZroJa-V0QPAPU5sYU3asmD-2yn2ytca0` |
| **Body Type** | Raw (application/json) |

#### Body (JSON):
```json
{
  "to": "{{1.messages[1].from}}",
  "mediaUrl": "{{15.foto_destaque}}",
  "mediaType": "image/jpeg",
  "caption": "🏠 *{{15.tipo}}* - {{15.bairro}}\n\n🛏️ {{15.quartos}} quarto(s)\n💰 {{15.preco_formatado}}\n\n🔗 {{15.link}}"
}
```

> **Nota**: Substitua `15` pelo ID real do seu módulo Iterator

---

## Diagrama do Fluxo Atualizado

```text
┌─────────────────────────────────────────────────────────────────┐
│                     CENÁRIO MAKE.COM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   [1] WhatsApp Watch Events                                     │
│           │                                                     │
│           ▼                                                     │
│   ┌───────────────────────────────────────┐                    │
│   │ Filtro: messages[1].id exists         │                    │
│   └───────────────────────────────────────┘                    │
│           │                                                     │
│           ▼                                                     │
│   [14] HTTP → make-webhook (Supabase)                          │
│           │                                                     │
│           ▼                                                     │
│   ┌───────────────────────────────────────┐                    │
│   │            ROUTER                      │                    │
│   └───────────────────────────────────────┘                    │
│        │                              │                         │
│   [Tem imóveis]                 [Sem imóveis]                   │
│        │                              │                         │
│        ▼                              ▼                         │
│   [Iterator]                  HTTP → send-wa-message            │
│   {{14.data.properties}}      (envia data.result)               │
│        │                                                        │
│        ▼ (para cada imóvel)                                     │
│   ┌─────────────────────────────────────┐                      │
│   │  HTTP → send-wa-media (Supabase)    │  ← NOVO              │
│   │  • Envia imagem via WhatsApp        │                      │
│   │  • Salva no banco de dados          │                      │
│   │  • Vincula à conversa               │                      │
│   └─────────────────────────────────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Benefícios da Mudança

| Antes (Módulo Nativo) | Depois (send-wa-media) |
|----------------------|------------------------|
| ❌ Imagem vai para o cliente | ✅ Imagem vai para o cliente |
| ❌ Não aparece na plataforma | ✅ Aparece no chat da plataforma |
| ❌ Sem contexto do atendimento | ✅ Vinculada à conversa correta |
| ❌ Não salva no banco | ✅ Registrada na tabela `messages` |

---

## Configuração Extra: Enviar Mensagem de Texto Final

Após o Iterator terminar, adicione outro HTTP Request para enviar o texto resumo (`data.result`):

| Campo | Valor |
|-------|-------|
| **URL** | `https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/send-wa-message` |
| **Method** | POST |
| **Body** | `{"to": "{{1.messages[1].from}}", "text": "{{14.data.result}}"}` |

---

## Resumo das Ações
1. **Remover** módulo nativo "WhatsApp > Send an Image"
2. **Adicionar** HTTP Request dentro do Iterator chamando `send-wa-media`
3. **Configurar** headers com Authorization Bearer
4. **Mapear** campos: to, mediaUrl, mediaType, caption
5. **Testar** enviando mensagem real e verificando na plataforma

---

## Observação Importante
Essa solução usa as edge functions existentes do projeto. Não é necessário alterar nenhum código no Supabase - apenas a configuração do Make.com.
