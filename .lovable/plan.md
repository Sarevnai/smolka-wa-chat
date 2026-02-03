

# Plano: Correções Críticas no Fluxo de Atendimento

## Visão Geral

Este plano implementa três correções críticas identificadas na análise do atendimento com Ian:

1. **Limpar `pending_properties` quando critérios mudarem** - evitar que imóveis antigos fiquem "grudados"
2. **Bloquear duplicatas ANTES de enviar** - impedir mensagens repetidas no cliente
3. **Detectar pedidos explícitos de mudança de quartos** - reconhecer frases como "quero 3 quartos"

---

## Problema 1: Estado "Grudado" de Imóveis

### Situação Atual
Quando o cliente muda critérios (ex: "quero 3 quartos" em vez de 2), o sistema:
- Atualiza `lead_qualification` com os novos dados
- MAS mantém `pending_properties` com imóveis da busca antiga
- Resultado: IA continua apresentando imóveis que não atendem os novos critérios

### Solução
Modificar a função `detectFlexibilization` para, além de detectar mudanças, limpar automaticamente o estado consultivo quando critérios-chave mudarem.

**Arquivo:** `supabase/functions/make-webhook/index.ts`

**Alterações:**
- Criar nova função `clearConsultativeStateOnCriteriaChange()`
- Chamar essa função logo após detectar flexibilização (linha ~2875)
- Limpar `pending_properties`, `current_property_index` e `awaiting_property_feedback`

---

## Problema 2: Duplicatas Enviadas ao Cliente

### Situação Atual
O check `isSameMessage` ocorre na linha 3167-3195, MAS:
- A mensagem já foi preparada para envio
- O check só gera uma "alternativa" se duplicata detectada
- Em alguns casos, a mensagem ainda vai duplicada para o Make.com

### Solução
Mover o check de duplicata para ANTES da geração da resposta AI, usando uma flag de bloqueio pré-emptivo.

**Arquivo:** `supabase/functions/make-webhook/index.ts`

**Alterações:**
- Criar função `shouldBlockDuplicate()` que verifica última mensagem outbound
- Chamar ANTES de montar a resposta (linha ~2868)
- Se duplicata iminente detectada, forçar `getNextQualificationQuestion()` ou buscar imóveis

---

## Problema 3: Pedidos Explícitos de Quartos Ignorados

### Situação Atual
A função `detectFlexibilization` captura:
- "pode ser 3 quartos" ✅
- "aceito 3 quartos" ✅
- "3" (resposta simples) ✅

Mas NÃO captura:
- "quero 3 quartos" ❌
- "preciso de 3 quartos" ❌
- "gostaria de 3 dormitórios" ❌
- "me mostra de 3 quartos" ❌

### Solução
Adicionar novos padrões de regex para detectar pedidos explícitos.

**Arquivo:** `supabase/functions/make-webhook/index.ts`

**Alterações na função `detectFlexibilization()` (linhas 1599-1768):**

Adicionar padrões para quartos:
```text
/(?:quero|preciso|gostaria|prefiro|busco|procuro)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i
/(?:me\s+)?(?:mostra|manda|envia)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?)/i
/tenha\s*(\d+)\s*(?:quartos?|qtos?)/i
```

---

## Problema 4: Feedback "Mais Opções" Mal Interpretado

### Situação Atual
A função `analyzePropertyFeedback` (linhas 1167-1174) classifica:
- "não, pode me mostrar mais" → `negative` (incorreto - deveria ser pedido de mais opções)
- O padrão `/mais/i` está no grupo `negative`

### Solução
Adicionar um terceiro tipo de feedback: `more_options` para diferenciar rejeição real de pedido de alternativas.

**Arquivo:** `supabase/functions/make-webhook/index.ts`

**Alterações:**
```text
// Nova lógica de 4 estados
function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'more_options' | 'neutral'
```

Padrões para `more_options`:
- "mais opções"
- "outras opções"
- "outra opção"
- "tem mais"
- "mostra outro"
- "próximo"
- "outro imóvel"

---

## Implementação Técnica

### Fase 1: Limpeza de Estado ao Mudar Critérios

```text
Linha ~2871 (após detectar flexibilização):

if (flexibilization.detected) {
  // NOVO: Limpar estado consultivo quando critérios-chave mudam
  if (flexibilization.fields.includes('quartos') || 
      flexibilization.fields.includes('bairro') || 
      flexibilization.fields.includes('orçamento') ||
      flexibilization.fields.includes('tipo')) {
    
    console.log('🔄 Criteria changed - clearing consultative state');
    await updateConsultativeState(supabase, phoneNumber, {
      pending_properties: [],
      current_property_index: 0,
      awaiting_property_feedback: false
    });
  }
  
  // Atualização existente continua...
  await updateQualificationData(supabase, phoneNumber, flexibilization.updates, true);
}
```

### Fase 2: Check Pré-emptivo de Duplicatas

```text
Nova função (adicionar após isSameMessage ~linha 1799):

async function shouldSkipAsDuplicate(
  supabase: any, 
  conversationId: string | null, 
  intendedMessage: string
): Promise<{ skip: boolean; alternative: string | null }> {
  if (!conversationId) return { skip: false, alternative: null };
  
  const lastOutbound = await getLastOutboundMessage(supabase, conversationId);
  if (isSameMessage(lastOutbound, intendedMessage)) {
    console.log('🚫 PRE-EMPTIVE: Would send duplicate - blocking');
    return { skip: true, alternative: null };
  }
  return { skip: false, alternative: null };
}
```

### Fase 3: Novos Padrões de Quartos

```text
Linha ~1606 (dentro de detectFlexibilization):

// PADRÃO EXISTENTE (flexibilização)
const quartosFlex = message.match(/(?:pode\s+ser|aceito|tá\s+bom...)/i);

// NOVO: Pedidos explícitos de quartos
if (!updates.detected_bedrooms) {
  const explicitBedroomPatterns = [
    /(?:quero|preciso|gostaria|prefiro|busco|procuro)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i,
    /(?:me\s+)?(?:mostra|manda|envia)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?)/i,
    /(?:tenha|com)\s*(\d+)\s*(?:quartos?|qtos?)/i,
    /(\d+)\s*(?:quartos?|qtos?)\s*(?:por favor|pf)?$/i
  ];
  
  for (const pattern of explicitBedroomPatterns) {
    const match = message.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 1 && num <= 10) {
        updates.detected_bedrooms = num;
        fields.push('quartos');
        console.log('📝 Explicit bedroom request detected: ${num}');
        break;
      }
    }
  }
}
```

### Fase 4: Feedback "Mais Opções"

```text
Linha 1167 (função analyzePropertyFeedback):

function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'more_options' | 'neutral' {
  // Primeiro: detectar pedido de mais opções (prioridade sobre negative)
  const moreOptions = /mais\s+op[çc][oõ]es|outr[ao]s?\s+op[çc][oõ]es|tem\s+mais|mostra\s+outro|pr[oó]ximo|outro\s+im[oó]vel|pode\s+me\s+mostrar\s+mais|mais\s+um|mais\s+algum/i;
  if (moreOptions.test(message)) return 'more_options';
  
  // Depois: feedback positivo/negativo/neutro
  const positive = /gostei|interess|visitar|marcar|quero\s+esse|perfeito|[oó]timo|bom|show|pode ser|adorei|amei|lindo|maravilh|excelente|isso|sim|quero ver|agendar/i;
  
  // MODIFICADO: remover "mais" e "outro" do negative (agora em more_options)
  const negative = /não|caro|longe|pequeno|grande|diferente|menos|demais|muito|acima|baixo|descartado|n[aã]o gostei|ruim|horr[ií]vel|nao/i;
  
  if (positive.test(message)) return 'positive';
  if (negative.test(message)) return 'negative';
  return 'neutral';
}
```

E ajustar o handler (linha ~2936):

```text
} else if (feedback === 'negative' || feedback === 'more_options') {
  // Ambos avançam para próximo imóvel, mas com mensagem diferente
  const nextIndex = currentIndex + 1;
  
  if (nextIndex < pendingProperties.length) {
    propertiesToSend = [pendingProperties[nextIndex]];
    
    await updateConsultativeState(supabase, phoneNumber, {
      current_property_index: nextIndex,
      awaiting_property_feedback: true
    });
    
    const nameGreet = existingName ? ', ${existingName}' : '';
    aiResponse = feedback === 'more_options'
      ? 'Claro${nameGreet}! Tenho mais esta opção:'
      : 'Entendi${nameGreet}! 😊 Tenho outra opção que pode ser mais adequada.';
  }
}
```

---

## Arquivos Modificados

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/make-webhook/index.ts` | 4 mudanças principais |

---

## Ordem de Implementação

1. **Adicionar padrões explícitos de quartos** em `detectFlexibilization` 
2. **Criar lógica de limpeza de estado** após detecção de flexibilização
3. **Melhorar `analyzePropertyFeedback`** com estado `more_options`
4. **Adicionar check pré-emptivo** de duplicatas (opcional - menor impacto)

---

## Testes Sugeridos

Após implementação, testar os seguintes cenários:

1. **Mudança de quartos:** Enviar "quero 3 quartos" após ter dito "2 quartos" → deve limpar `pending_properties` e buscar novamente
2. **Pedido explícito:** Enviar "preciso de 2 dormitórios" → deve detectar e salvar em `lead_qualification`
3. **Mais opções:** Enviar "tem mais opções?" → deve avançar para próximo imóvel sem mensagem de rejeição
4. **Anti-duplicata:** Forçar resposta repetida → deve gerar alternativa ou avançar fluxo

