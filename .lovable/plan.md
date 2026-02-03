
# Plano: Melhorar Detecção de Feedback em analyzePropertyFeedback

## Problema Atual

A função `analyzePropertyFeedback` tem uma lógica de prioridade simples:
1. Testa `more_options` primeiro
2. Depois `positive`
3. Depois `negative`
4. Fallback para `neutral`

**Falhas identificadas:**
- "não gostei, tem outro?" → detecta `negative` (deveria ser `more_options`)
- "não, mostra mais opções" → detecta `negative` (deveria ser `more_options`)
- "pode ser esse, mas quero ver mais" → detecta `positive` (deveria ser `more_options`)
- "show, mas tem mais barato?" → complexo: interesse + pedido de alternativa

## Solução: Análise Contextual com Priorização Inteligente

### Estratégia

1. **Detectar combinações primeiro**: Quando uma mensagem tem elementos de múltiplas categorias, aplicar regras de prioridade contextual
2. **Expandir padrões**: Adicionar mais variações do português brasileiro
3. **Tratar negação + pedido**: "não X, tem Y?" sempre prioriza a intenção final (pedido)
4. **Adicionar estado `interested_but_more`**: Para casos como "curti, mas quero ver mais"

---

## Implementação Técnica

### Fase 1: Reestruturação da Função

```typescript
function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'more_options' | 'interested_but_more' | 'neutral' {
  const lower = message.toLowerCase().trim();
  
  // ===== EXPANDED PATTERNS =====
  
  // Pedido de mais opções (expandido)
  const moreOptionsPatterns = [
    // Direto
    /mais\s+op[çc][oõ]es/i,
    /outr[ao]s?\s+op[çc][oõ]es/i,
    /tem\s+mais/i,
    /mostr[ae]\s+outr[oa]/i,
    /pr[oó]xim[oa]/i,
    /outro\s+im[oó]vel/i,
    /pode\s+me\s+mostrar\s+mais/i,
    /mais\s+um/i,
    /mais\s+algum/i,
    /quero\s+ver\s+outr[oa]/i,
    /pode\s+mostrar\s+outr[oa]/i,
    /envia\s+outr[oa]/i,
    /manda\s+outr[oa]/i,
    // Novo: padrões coloquiais
    /t[eê]m\s+outr[oa]/i,
    /algum\s+outr[oa]/i,
    /ver\s+mais/i,
    /mais\s+esse[s]?\s+n[aã]o/i,
    /pass[ae]\s+pro\s+pr[oó]ximo/i,
    /pul[ae]\s+esse/i,
    /segue|seguinte/i,
    /avan[çc]ar/i,
  ];
  
  // Feedback positivo (interesse real)
  const positivePatterns = [
    /gostei\s+(?:muito\s+)?(?:desse|dele|dessa)/i,
    /interess(?:ei|ado|ada|ante)/i,
    /quero\s+visitar/i,
    /quero\s+conhecer/i,
    /marcar\s+visita/i,
    /agendar/i,
    /quero\s+esse/i,
    /é\s+esse/i,
    /perfeito/i,
    /[oó]timo/i,
    /excelente/i,
    /adorei/i,
    /amei/i,
    /fechado/i,
    /fechou/i,
    /curti\s+(?:muito\s+)?(?:esse|esse\s+aqui)/i,
    /pode\s+ser\s+esse/i,
    /vamos\s+(?:nesse|nessa|com\s+esse)/i,
    /quero\s+saber\s+mais\s+(?:sobre\s+)?esse/i,
  ];
  
  // Feedback negativo (rejeição real)
  const negativePatterns = [
    /n[aã]o\s+gostei/i,
    /n[aã]o\s+curti/i,
    /n[aã]o\s+(?:me\s+)?interess/i,
    /muito\s+caro/i,
    /acima\s+do\s+(?:meu\s+)?or[çc]amento/i,
    /fora\s+do\s+(?:meu\s+)?or[çc]amento/i,
    /longe\s+demais/i,
    /(?:muito\s+)?pequen[oa]/i,
    /(?:muito\s+)?grande/i,
    /n[aã]o\s+serve/i,
    /n[aã]o\s+(?:é|e)\s+o\s+que\s+(?:eu\s+)?(?:procuro|quero)/i,
    /descart(?:o|ei|ado)/i,
    /horr[ií]vel/i,
    /p[eé]ssim[oa]/i,
  ];
  
  // ===== COMPOUND DETECTION (PRIORITY) =====
  
  // Check if message has BOTH negative/positive AND more_options intent
  const hasMoreIntent = moreOptionsPatterns.some(p => p.test(lower));
  const hasPositiveIntent = positivePatterns.some(p => p.test(lower));
  const hasNegativeIntent = negativePatterns.some(p => p.test(lower));
  
  // RULE 1: Negative + More → more_options (they rejected but want alternatives)
  // Ex: "não gostei, tem outro?", "esse não serve, próximo"
  if (hasNegativeIntent && hasMoreIntent) {
    console.log('📊 Compound detected: negative + more → more_options');
    return 'more_options';
  }
  
  // RULE 2: Positive + More → interested_but_more (they liked but want to compare)
  // Ex: "gostei, mas quero ver mais", "curti, tem outras opções?"
  if (hasPositiveIntent && hasMoreIntent) {
    console.log('📊 Compound detected: positive + more → interested_but_more');
    return 'interested_but_more';
  }
  
  // RULE 3: Just "mas" or "porém" followed by more → more_options
  // Ex: "ok, mas mostra outro", "tá, mas tem mais?"
  const butMorePattern = /(?:mas|por[eé]m|entretanto)\s*(?:,?\s*)(?:mostr|tem|quero|ver|envi|mand)/i;
  if (butMorePattern.test(lower)) {
    console.log('📊 Compound detected: but + action → more_options');
    return 'more_options';
  }
  
  // ===== SIMPLE DETECTION (in order of specificity) =====
  
  // More options (highest priority for explicit requests)
  if (hasMoreIntent) {
    console.log('📊 Detected feedback: more_options');
    return 'more_options';
  }
  
  // Positive
  if (hasPositiveIntent) {
    console.log('📊 Detected feedback: positive');
    return 'positive';
  }
  
  // Negative  
  if (hasNegativeIntent) {
    console.log('📊 Detected feedback: negative');
    return 'negative';
  }
  
  // Neutral fallback
  console.log('📊 Detected feedback: neutral');
  return 'neutral';
}
```

---

### Fase 2: Ajustar Handler para Novo Estado

Adicionar tratamento para `interested_but_more` no handler (linha ~3013):

```typescript
} else if (feedback === 'negative' || feedback === 'more_options' || feedback === 'interested_but_more') {
  // Handle price flexibility only for pure negative
  if (feedback === 'negative') {
    const priceFlexibility = detectPriceFlexibility(messageContent);
    // ... existing code
  }
  
  // Show next property for all three cases
  if (!aiResponse) {
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < pendingProperties.length) {
      propertiesToSend = [pendingProperties[nextIndex]];
      
      await updateConsultativeState(supabase, phoneNumber, {
        current_property_index: nextIndex,
        awaiting_property_feedback: true
      });
      
      const nameGreet = existingName ? `, ${existingName}` : '';
      
      // Customized responses for each type
      if (feedback === 'interested_but_more') {
        aiResponse = `Que bom que gostou${nameGreet}! 😊 Vou guardar esse. Enquanto isso, olha essa outra opção:`;
      } else if (feedback === 'more_options') {
        aiResponse = `Claro${nameGreet}! 😊 Tenho mais esta opção:`;
      } else {
        aiResponse = `Entendi${nameGreet}! 😊 Tenho outra que pode ser mais adequada:`;
      }
    } else {
      // No more properties
      if (feedback === 'interested_but_more') {
        aiResponse = `Essas são as opções que encontrei! 😊 Quer que eu encaminhe o primeiro que você curtiu para um consultor entrar em contato?`;
      } else {
        aiResponse = `Essas eram todas as opções com esses critérios. 🤔\n\nPodemos ajustar a busca?`;
      }
    }
  }
}
```

---

## Casos de Teste

| Mensagem | Esperado | Antes | Depois |
|----------|----------|-------|--------|
| "não gostei, tem outro?" | more_options | negative | more_options |
| "não, mostra mais" | more_options | negative | more_options |
| "gostei, mas quero ver mais" | interested_but_more | positive | interested_but_more |
| "curti, tem outras?" | interested_but_more | positive | interested_but_more |
| "próximo" | more_options | more_options | more_options |
| "quero visitar esse" | positive | positive | positive |
| "muito caro" | negative | negative | negative |
| "ok" | neutral | neutral | neutral |
| "pula esse" | more_options | neutral | more_options |
| "passa pro próximo" | more_options | neutral | more_options |

---

## Arquivos Modificados

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/make-webhook/index.ts` | ~80 linhas modificadas |

---

## Benefícios

1. **Detecta intenção final**: Em mensagens compostas, identifica o que o cliente realmente quer
2. **Novo estado útil**: `interested_but_more` permite marcar imóveis como "curtidos" para retomar depois
3. **Mais padrões coloquiais**: Captura gírias e contrações do português brasileiro
4. **Logs detalhados**: Identifica qual regra de compound foi aplicada
5. **Mantém compatibilidade**: Estados existentes continuam funcionando
