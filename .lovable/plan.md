

# Plano: Redirecionamento de Locação/Administrativo para 48 9 91631011

## Contexto da Arquitetura

O sistema possui duas frentes de atendimento WhatsApp:

| Frente | Número | Funções Edge | Responsabilidade |
|--------|--------|--------------|------------------|
| **Make Integration** | 48 9 91631011 | `make-webhook` | Triagem, pré-atendimento de **locação**, **vendas** e **administrativo** |
| **API Direta Meta** | 48 2398-0016 | `ai-arya-vendas`, `ai-virtual-agent` | Landing pages, disparos em massa, **empreendimentos apenas** |

## Problema Identificado

As funções `ai-arya-vendas` e `ai-virtual-agent` (API Direta Meta):
- **NÃO** detectam perguntas sobre locação ou administrativo
- **NÃO** redirecionam o cliente para o número correto
- Podem gerar frustração ao tentar responder assuntos fora do escopo

## Solução Proposta

### Fase 1: Função de Detecção de Escopo Incorreto

Criar uma função reutilizável que detecta quando o cliente pergunta sobre locação ou administrativo:

```typescript
// Patterns para detectar perguntas fora do escopo
const OUT_OF_SCOPE_PATTERNS = {
  locacao: [
    /\b(alugar|aluguel|loca[çc][aã]o|locar|alugo|quero\s+alugar)\b/i,
    /\b(apartamento|casa|kit(net)?)\s+(pra|para|de)?\s*alug/i,
    /\bim[oó]vel\s+(pra|para)?\s*locar\b/i,
  ],
  administrativo: [
    /\b(boleto|2[ªa]\s*via|segunda\s*via|pagar|pagamento)\b/i,
    /\b(contrato|rescis[aã]o|renova[çc][aã]o)\b/i,
    /\b(manuten[çc][aã]o|conserto|reparo|vazamento|problema)\b/i,
    /\b(j[aá]\s*sou\s*cliente|inquilino|propriet[aá]rio)\b/i,
    /\b(falar\s+com|atendimento|sac)\b/i,
  ]
};

function detectOutOfScope(message: string): 'locacao' | 'administrativo' | null {
  const lower = message.toLowerCase();
  
  for (const pattern of OUT_OF_SCOPE_PATTERNS.locacao) {
    if (pattern.test(lower)) return 'locacao';
  }
  
  for (const pattern of OUT_OF_SCOPE_PATTERNS.administrativo) {
    if (pattern.test(lower)) return 'administrativo';
  }
  
  return null;
}
```

### Fase 2: Mensagem de Redirecionamento

Mensagem padronizada para enviar ao cliente:

```typescript
const REDIRECT_MESSAGES = {
  locacao: `Entendi que você busca um imóvel para alugar! 🏠

Para locação, nossa equipe especializada pode te ajudar melhor pelo número:
📱 *48 9 9163-1011*

Lá você vai ter atendimento completo para encontrar o imóvel ideal! 😊`,

  administrativo: `Entendi! Para questões administrativas como boletos, contratos ou manutenção, nosso time de suporte pode te ajudar:
📱 *48 9 9163-1011*

Eles vão resolver sua solicitação rapidinho! 😊`
};
```

### Fase 3: Integração no ai-arya-vendas

**Localização:** `supabase/functions/ai-arya-vendas/index.ts`

**Antes de processar a mensagem** (após receber a mensagem, antes de chamar OpenAI):

```typescript
// === EARLY EXIT: Check for out-of-scope requests ===
const outOfScope = detectOutOfScope(message);
if (outOfScope) {
  console.log(`⚠️ Out of scope detected: ${outOfScope}`);
  
  const redirectMessage = REDIRECT_MESSAGES[outOfScope];
  await saveAndSendMessage(supabase, conversationId, phone_number, redirectMessage);
  
  // Log the redirect
  await supabase.from('activity_logs').insert({
    user_id: '00000000-0000-0000-0000-000000000000',
    action_type: 'ai_arya_redirect_out_of_scope',
    target_table: 'conversations',
    target_id: phone_number,
    metadata: {
      detected_scope: outOfScope,
      message_preview: message.substring(0, 100),
      redirected_to: '48 9 9163-1011'
    }
  });
  
  return new Response(
    JSON.stringify({
      success: true,
      action: 'redirected_out_of_scope',
      scope_detected: outOfScope,
      development: development ? { id: development.id, name: development.name } : null
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Fase 4: Integração no ai-virtual-agent

**Localização:** `supabase/functions/ai-virtual-agent/index.ts`

**Mesma lógica**, aplicada no início do handler principal (linha ~2750, após receber a requisição):

```typescript
// === SCOPE CHECK FOR DIRECT API (Marketing/Empreendimentos channel) ===
// This channel should NOT handle locacao or administrativo
const isDirectApiChannel = true; // This function IS the direct API channel

if (isDirectApiChannel) {
  const outOfScope = detectOutOfScope(messageBody);
  if (outOfScope) {
    console.log(`⚠️ Direct API: Out of scope request (${outOfScope}), redirecting...`);
    
    await sendWhatsAppMessage(phoneNumber, REDIRECT_MESSAGES[outOfScope]);
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'redirected_out_of_scope',
        scope_detected: outOfScope
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

### Fase 5: Atualizar os Prompts

Adicionar instrução nos prompts do `ai-arya-vendas` para reforçar a restrição:

```typescript
// No final do buildQuickTransferPrompt e buildEmpreendimentoPrompt:
`
═══════════════════════════════════════════════════════════════
🚫 RESTRIÇÕES DE ESCOPO
═══════════════════════════════════════════════════════════════

Você NÃO deve responder perguntas sobre:
- LOCAÇÃO/ALUGUEL de imóveis
- Questões ADMINISTRATIVAS (boletos, contratos, manutenção)
- Atendimento a CLIENTES EXISTENTES

Se o cliente perguntar sobre esses assuntos, oriente-o a entrar em contato pelo número 48 9 9163-1011 onde terá atendimento especializado.
`
```

---

## Fluxo de Decisão

```text
┌─────────────────────────────────────────────────────────────┐
│                    Mensagem Recebida                        │
│              (ai-arya-vendas / ai-virtual-agent)            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │  detectOutOfScope(message)  │
              └──────────────┬──────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
        'locacao'    'administrativo'       null
            │                │                │
            ▼                ▼                ▼
    ┌───────────────────────────────┐  ┌─────────────────────┐
    │     Enviar Mensagem de        │  │  Processamento      │
    │     Redirecionamento          │  │  Normal (OpenAI)    │
    │  → 48 9 9163-1011             │  │  → Empreendimentos  │
    └───────────────────────────────┘  └─────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/ai-arya-vendas/index.ts` | +60 linhas (detecção + redirecionamento) |
| `supabase/functions/ai-virtual-agent/index.ts` | +60 linhas (mesma lógica) |

---

## Casos de Teste

| Mensagem do Cliente | Esperado |
|---------------------|----------|
| "Quero alugar um apartamento" | Redirecionamento para 48 9 9163-1011 |
| "Preciso da 2ª via do boleto" | Redirecionamento para 48 9 9163-1011 |
| "Tenho um problema de manutenção" | Redirecionamento para 48 9 9163-1011 |
| "Já sou cliente, preciso falar com alguém" | Redirecionamento para 48 9 9163-1011 |
| "Quero saber mais sobre o Villa Maggiore" | Atendimento normal (empreendimento) |
| "Quanto custa o apartamento de 3 quartos?" | Atendimento normal (empreendimento) |
| "Quero investir em imóvel" | Atendimento normal (vendas/investimento) |

---

## Benefícios

1. **Experiência do Cliente**: Direcionamento claro para o canal correto
2. **Eficiência Operacional**: Evita que o agente de empreendimentos tente responder assuntos fora do escopo
3. **Rastreabilidade**: Logs de redirecionamento para métricas
4. **Separação Clara de Responsabilidades**: Cada canal cuida do seu domínio

