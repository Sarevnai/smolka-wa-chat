# ✅ IMPLEMENTADO: Correções Críticas no Fluxo de Atendimento

**Status:** Concluído em 2026-02-03
**Arquivo modificado:** `supabase/functions/make-webhook/index.ts`

---

## Resumo das 4 Correções Implementadas

### 1. ✅ Limpeza de Estado ao Mudar Critérios
- **Problema:** `pending_properties` mantinha imóveis antigos após cliente mudar critérios
- **Solução:** Após detectar flexibilização de campos-chave (quartos, bairro, orçamento, tipo), o sistema agora limpa automaticamente:
  - `pending_properties: []`
  - `current_property_index: 0`
  - `awaiting_property_feedback: false`

### 2. ✅ Padrões Explícitos de Quartos
- **Problema:** Sistema não detectava "quero 3 quartos", "preciso de 2 dormitórios"
- **Solução:** Adicionados 5 novos padrões de regex em `detectFlexibilization`:
  - `quero/preciso/gostaria/prefiro/busco/procuro X quartos`
  - `me mostra/manda/envia de X quartos`
  - `que tenha/com X quartos`
  - `X quartos por favor`
  - `apartamento/casa de X quartos`

### 3. ✅ Feedback "Mais Opções" 
- **Problema:** "pode me mostrar mais" era classificado como `negative`
- **Solução:** `analyzePropertyFeedback` agora retorna 4 estados:
  - `positive` → cliente interessado, trigger C2S
  - `negative` → rejeição real (caro, longe, pequeno...)
  - `more_options` → pedido de alternativas com mensagem diferenciada
  - `neutral` → feedback indefinido

### 4. ✅ Check Pré-emptivo de Duplicatas
- **Problema:** Mensagens duplicadas eram detectadas tarde demais
- **Solução:** Nova função `shouldSkipAsDuplicate()` para verificar antes de enviar

---

## Código Alterado

```typescript
// 1. analyzePropertyFeedback com 4 estados
function analyzePropertyFeedback(message: string): 'positive' | 'negative' | 'more_options' | 'neutral'

// 2. Novos padrões de quartos em detectFlexibilization
const explicitBedroomPatterns = [
  /(?:quero|preciso|gostaria|prefiro|busco|procuro)\s*(?:de\s*)?\s*(\d+)\s*(?:quartos?|qtos?|dormit[oó]rios?)/i,
  // ... mais padrões
];

// 3. Limpeza de estado consultivo
if (hasKeyFieldChange) {
  await updateConsultativeState(supabase, phoneNumber, {
    pending_properties: [],
    current_property_index: 0,
    awaiting_property_feedback: false
  });
}

// 4. Mensagens diferenciadas para more_options vs negative
aiResponse = feedback === 'more_options'
  ? `Claro${nameGreet}! 😊 Tenho mais esta opção:`
  : `Entendi${nameGreet}! 😊 Tenho outra opção que pode ser mais adequada.`;
```

---

## Testes Recomendados

1. **Mudança de quartos:** Enviar "quero 3 quartos" após ter dito "2 quartos" → deve limpar `pending_properties`
2. **Pedido explícito:** Enviar "preciso de 2 dormitórios" → deve salvar em `lead_qualification`
3. **Mais opções:** Enviar "tem mais opções?" → deve avançar com mensagem "Claro! Tenho mais esta opção:"
4. **Rejeição real:** Enviar "não gostei, muito caro" → deve avançar com mensagem "Entendi! Tenho outra opção..."
