# Plano: Fluxo de Atendimento Consultivo (1 a 1)

## ✅ Status: IMPLEMENTADO

O fluxo consultivo foi implementado com sucesso. A IA agora apresenta imóveis 1 a 1 e nunca agenda visitas diretamente.

---

## Mudanças Implementadas

### 1. Database Migration ✅
- Adicionado `current_property_index` (integer) em `conversation_states`
- Adicionado `awaiting_property_feedback` (boolean) em `conversation_states`
- Campo `pending_properties` já existia

### 2. Prompts Atualizados ✅
- `buildLocacaoPrompt` e `buildVendasPrompt` com novas regras:
  - NUNCA enviar lista grande
  - Sempre 1 imóvel por vez
  - Perguntar "Esse imóvel faz sentido pra você?"
  - NUNCA agendar visitas
  - Encaminhar para consultor via C2S

### 3. Lógica de Busca ✅
- Salva até 5 imóveis em `pending_properties`
- Envia apenas o PRIMEIRO imóvel
- Marca `awaiting_property_feedback = true`

### 4. Análise de Feedback ✅
- Função `analyzePropertyFeedback()` detecta:
  - `positive`: "gostei", "quero visitar", etc → Inicia fluxo C2S
  - `negative`: "caro", "longe", etc → Pergunta motivo, mostra próximo
  - `neutral`: Pede esclarecimento

### 5. Resposta JSON Atualizada ✅
- Novo campo `presentation_state` com:
  - `awaiting_feedback`: boolean
  - `current_index`: número do imóvel atual
  - `total_found`: total encontrado
  - `property_code`: código do imóvel apresentado

---

## Exemplo de Resposta para Make.com

```json
{
  "success": true,
  "result": "Encontrei um imóvel que pode combinar com o que você busca! 🏠",
  "properties": [{
    "codigo": "7558",
    "foto_destaque": "https://...",
    "tipo": "Apartamento",
    "bairro": "Centro",
    "quartos": 2,
    "preco_formatado": "R$ 2.500",
    "link": "https://..."
  }],
  "presentation_state": {
    "awaiting_feedback": true,
    "current_index": 0,
    "total_found": 5,
    "property_code": "7558"
  },
  "c2s_transferred": false
}
```

---

## Configuração do Make.com

Para sincronizar mensagens com a plataforma, usar HTTP Requests:

### Enviar Imagem
- URL: `https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/send-wa-media`
- Body: `{"to": "{{phone}}", "mediaUrl": "{{foto_destaque}}", "caption": "🏠 *{{tipo}}* - {{bairro}}\n🛏️ {{quartos}} quartos\n💰 {{preco_formatado}}"}`

### Enviar Texto
- URL: `https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/send-wa-message`
- Body: `{"to": "{{phone}}", "text": "{{result}}"}`
