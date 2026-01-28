

# Correção: Botões de Template Retornam Erro "Missing required fields"

## Diagnóstico

O erro ocorre porque a validação do webhook verifica o campo `message` original, que está vazio quando o cliente clica em um botão de template.

**Linha 1035 (atual):**
```typescript
if (!phone || (!message && !media_url)) {
  // Erro: "Missing required fields: phone and (message or media_url)"
}
```

**Problema:**
- Quando `message_type = "button"`, o campo `message` vem vazio do Make
- O conteúdo real está em `button_text` ou `button_payload`
- A linha 975 já corrige isso para `messageContent`, mas a validação na linha 1035 ainda usa `message`

## Solução

Atualizar a validação para considerar `button_text` e `button_payload` como alternativas válidas ao campo `message`.

## Alteração Técnica

### Arquivo: `supabase/functions/make-webhook/index.ts`

**Linha 1035 - Alterar de:**
```typescript
if (!phone || (!message && !media_url)) {
```

**Para:**
```typescript
if (!phone || (!message && !media_url && !button_text && !button_payload)) {
```

Isso permite que requisições com botões passem pela validação, desde que tenham `phone` E pelo menos um de:
- `message` (texto normal)
- `media_url` (mídia)
- `button_text` (texto do botão clicado)
- `button_payload` (payload do botão clicado)

## Fluxo Corrigido

```text
┌──────────────────────────────────────────────────────────────┐
│           CLIENTE CLICA NO BOTÃO "ALUGAR"                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Make.com envia para webhook:                                │
│  {                                                           │
│    phone: "554888182882",                                    │
│    message: "",              ← vazio (botões não têm texto)  │
│    message_type: "button",                                   │
│    button_text: "Alugar",    ← conteúdo real                │
│    button_payload: "Setor de locação"                        │
│  }                                                           │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  VALIDAÇÃO (CORRIGIDA)                                       │
│  phone ✓                                                     │
│  message ✗ (vazio)                                           │
│  media_url ✗ (vazio)                                         │
│  button_text ✓ ("Alugar")  ← AGORA É VERIFICADO!            │
│                                                              │
│  Resultado: PASSA na validação                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  messageContent = "Alugar" (linha 975)                       │
│  Departamento detectado: locacao                             │
│  Inicia pré-atendimento de locação                          │
└──────────────────────────────────────────────────────────────┘
```

## Resumo

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `supabase/functions/make-webhook/index.ts` | 1035 | Adicionar `button_text` e `button_payload` à validação |

## Resultado Esperado

Após a correção:
1. Cliente clica em "Alugar" → Webhook aceita a requisição
2. Departamento é atribuído como `locacao`
3. IA inicia pré-atendimento de locação
4. Fluxo continua normalmente

