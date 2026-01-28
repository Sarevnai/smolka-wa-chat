

# Disparo do Template de Triagem no Fluxo do Make

## Objetivo

Fazer com que o fluxo do Make dispare o template oficial `triagem_ia` com os botões de quick reply (Comprar, Alugar, Já sou cliente) quando chegar no momento de triagem, ao invés de enviar apenas texto.

## Análise do Template

O template `triagem_ia` já existe e está ativo:

```
Nome: triagem_ia
Categoria: MARKETING
Componentes:
- BODY: "Pra que eu consiga te encaminhar para o *Setor responsável*, selecione um botão."
- BUTTONS (QUICK_REPLY):
  - "Comprar"
  - "Alugar" 
  - "Já sou cliente"
```

## Desafio Técnico

O Make.com usa seu próprio módulo WhatsApp (número 4891631011), não a API direta (4823980016). O make-webhook retorna um JSON que o Make usa para enviar respostas.

**Solução**: Adicionar ao JSON de resposta um campo `send_template` que instrui o Make a enviar um template em vez de texto simples.

## Alterações Técnicas

### Arquivo: `supabase/functions/make-webhook/index.ts`

#### 1. Novo campo no retorno JSON (linha ~1296-1318)

Atualmente retorna:
```typescript
{
  success: true,
  result: aiResponse,      // Texto para o Make enviar
  audio: {...},
  metadata: {...}
}
```

Novo formato quando houver template:
```typescript
{
  success: true,
  result: aiResponse,       // Texto fallback
  send_template: {          // 🆕 Instrução para Make enviar template
    name: 'triagem_ia',
    language: 'pt_BR'
  },
  audio: {...},
  metadata: {...}
}
```

#### 2. Modificar fluxo de triagem para incluir template (linhas ~1107-1126 e ~1170-1189)

Quando o estágio mudar para `awaiting_triage`, além da mensagem de texto, adicionar flag para enviar template:

```typescript
// Variável para controle de template
let sendTriageTemplate = false;

// No fluxo de triagem, quando chegar na parte de mostrar opções:
if (!currentStage || currentStage === 'greeting') {
  if (existingName) {
    // Já tem nome - enviar template de triagem
    aiResponse = `Prazer em falar com você, ${existingName}! 😊`;
    sendTriageTemplate = true;  // 🆕 Flag para enviar template
    await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
  } else {
    aiResponse = `Olá! Aqui é a Helena da Smolka Imóveis 🏠\n\nComo você se chama?`;
    await updateTriageStage(supabase, phoneNumber, 'awaiting_name');
  }
}

// Quando recebe o nome:
if (currentStage === 'awaiting_name') {
  const detectedName = extractNameFromMessage(messageContent);
  if (detectedName) {
    await saveContactNameMake(supabase, phoneNumber, detectedName);
    aiResponse = `Prazer, ${detectedName}! 😊`;
    sendTriageTemplate = true;  // 🆕 Flag para enviar template
    await updateTriageStage(supabase, phoneNumber, 'awaiting_triage');
  }
}
```

#### 3. Incluir no retorno JSON (linha ~1296)

```typescript
return new Response(
  JSON.stringify({
    success: true,
    result: aiResponse,
    // 🆕 Template para Make enviar (quando aplicável)
    send_template: sendTriageTemplate ? {
      name: 'triagem_ia',
      language: 'pt_BR'
    } : null,
    phone: phoneNumber,
    agent,
    conversation_id: conversationId,
    audio: audioResult ? {...} : null,
    metadata: {...}
  }),
  { status: 200, headers: {...} }
);
```

## Fluxo Corrigido

```
┌────────────────────────────────────────────────────────────────────┐
│                    MAKE WEBHOOK - TRIAGEM                          │
└───────────────────────────┬────────────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │   Primeira mensagem?        │
              └──────────────┬──────────────┘
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐   ┌─────────────────────┐
         │  Já tem nome?    │   │  Pergunta existente │
         └────────┬─────────┘   │  (continua fluxo)   │
                  │             └─────────────────────┘
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
┌────────────────┐  ┌─────────────────────────────────────┐
│  NÃO          │  │  SIM                                │
│  Perguntar    │  │  Saudar + ENVIAR TEMPLATE triagem_ia│
│  o nome       │  │  (botões: Comprar/Alugar/Cliente)   │
└───────┬───────┘  └──────────────────────────────────────┘
        │
        ▼
┌────────────────────────────┐
│  Recebe nome do cliente    │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────────────────┐
│  Cumprimentar + ENVIAR TEMPLATE        │
│  triagem_ia com botões                 │
└────────────────────────────────────────┘
```

## Configuração do Make.com

O Make.com precisará:
1. Verificar se `send_template` existe no JSON de resposta
2. Se existir, usar módulo de template do WhatsApp ao invés de mensagem de texto
3. Se não existir, enviar o `result` como texto normal

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | Adicionar variável `sendTriageTemplate`, setar flag quando for mostrar opções de triagem, incluir `send_template` no JSON de resposta |

## Resultado Esperado

1. Cliente envia "Olá"
2. Make webhook retorna:
   - `result`: "Olá! Aqui é a Helena da Smolka Imóveis 🏠\n\nComo você se chama?"
   - `send_template`: null
3. Make envia texto normalmente

4. Cliente responde "João"
5. Make webhook retorna:
   - `result`: "Prazer, João! 😊"
   - `send_template`: { name: "triagem_ia", language: "pt_BR" }
6. Make envia:
   - Primeiro: texto "Prazer, João! 😊"
   - Depois: template com botões (Comprar/Alugar/Já sou cliente)

7. Cliente clica no botão "Alugar"
8. Make envia resposta do botão
9. Departamento é atribuído corretamente

