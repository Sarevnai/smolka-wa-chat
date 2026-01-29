
# Plano: Corrigir Loop do Eduardo - Busca Flexível e Atualização de Critérios

## Diagnóstico Confirmado

### O que aconteceu com o Eduardo:

1. **Pedido inicial**: Casa, 3 quartos, Campeche, até R$7.000
2. **Vista retornou 0** porque não há casas de **exatamente 3 quartos** no Campeche até R$7.000
3. **Mas existe**: Casa de 4 quartos no Campeche por R$12.500
4. **Cliente tentou flexibilizar 7 vezes** (2 quartos, 15 mil, sul da ilha, Ribeirão...)
5. **Sistema não processou** as flexibilizações e repetiu a mesma mensagem 7 vezes

### Dados do Vista (testados):
| Busca | Resultado |
|-------|-----------|
| Casa + Campeche + 3 quartos + R$15k | 0 imóveis ❌ |
| Casa + Campeche + **sem quartos** + R$15k | **1 imóvel** ✅ |
| Casa + **sem bairro** + R$15k | **5 imóveis** ✅ |

---

## Soluções a Implementar

### 1. Busca Progressivamente Mais Ampla ("Fallback Search")

Quando a busca retorna 0 resultados, tentar automaticamente:

```
Tentativa 1: todos os critérios (original)
    ↓ se 0 resultados
Tentativa 2: remover número de quartos
    ↓ se 0 resultados  
Tentativa 3: remover bairro (manter apenas tipo + preço)
    ↓ se 0 resultados
Desistir e perguntar ajustes específicos
```

**Nova função**: `searchPropertiesWithFallback()`

```javascript
async function searchPropertiesWithFallback(supabase, params) {
  // Tentativa 1: busca original
  let result = await searchProperties(supabase, params);
  if (result.properties?.length > 0) {
    return { ...result, searchType: 'exact' };
  }
  
  // Tentativa 2: sem quartos
  if (params.quartos) {
    const paramsNoQuartos = { ...params };
    delete paramsNoQuartos.quartos;
    result = await searchProperties(supabase, paramsNoQuartos);
    if (result.properties?.length > 0) {
      return { ...result, searchType: 'sem_quartos' };
    }
  }
  
  // Tentativa 3: sem bairro
  if (params.bairro) {
    const paramsNoBairro = { ...params };
    delete paramsNoBairro.bairro;
    delete paramsNoBairro.quartos;
    result = await searchProperties(supabase, paramsNoBairro);
    if (result.properties?.length > 0) {
      return { ...result, searchType: 'sem_bairro' };
    }
  }
  
  return { success: true, properties: [], searchType: 'no_results' };
}
```

**Mensagem adaptada ao tipo de busca**:
- `exact`: "Encontrei uma opção que combina! 🏠"
- `sem_quartos`: "Não encontrei com 3 quartos, mas tem uma de 4 quartos que pode te interessar:"
- `sem_bairro`: "Não encontrei no Campeche, mas olha essa opção em [outro bairro]:"
- `no_results`: "Não encontrei nada nessa faixa. Vamos ajustar: podemos aumentar o orçamento ou considerar outra região?"

---

### 2. Detectar e Processar Flexibilizações do Cliente

**Nova função**: `detectFlexibilization(message)`

Detectar quando o cliente está explicitamente flexibilizando um critério:

```javascript
function detectFlexibilization(message: string): Partial<QualificationData> {
  const lower = message.toLowerCase();
  const updates: Partial<QualificationData> = {};
  
  // "pode ser 2 quartos" → atualizar quartos
  const quartosFlex = message.match(/pode\s+ser\s+(\d+)\s*(?:quartos?|qtos?)/i);
  if (quartosFlex) {
    updates.detected_bedrooms = parseInt(quartosFlex[1]);
  }
  
  // "pode ser até 15 mil" → atualizar orçamento
  const budgetFlex = message.match(/(?:pode\s+ser\s+)?(?:até|ate)\s+(\d+[.,]?\d*)\s*(?:mil|k)?/i);
  if (budgetFlex) {
    let value = parseFloat(budgetFlex[1].replace(',', '.'));
    if (/mil|k/i.test(message) && value < 100) value *= 1000;
    updates.detected_budget_max = value;
  }
  
  // "pode ser no Ribeirão" → atualizar bairro
  const regionFlex = message.match(/pode\s+ser\s+(?:no|em|na|região)\s+([a-záàâãéèêíïóôõöúç\s]+)/i);
  if (regionFlex) {
    updates.detected_neighborhood = regionFlex[1].trim();
  }
  
  return updates;
}
```

**Forçar atualização** no `updateQualificationData()` quando detectado como flexibilização:
- Remover a proteção que impede sobrescrever valores existentes
- Logar: "📝 Flexibilization detected: bedrooms 3 → 2"

---

### 3. Anti-Repetição de Mensagem Idêntica

Antes de enviar a resposta, verificar se é idêntica à última:

```javascript
const lastOutbound = await getLastOutboundMessage(supabase, conversationId);
const isSameMessage = lastOutbound && lastOutbound.trim() === aiResponse.trim();

if (isSameMessage) {
  console.log('⚠️ Duplicate message detected - using alternative');
  // Forçar busca ampla ou pergunta específica
  aiResponse = 'Entendi que você está flexibilizando. Me confirma: quer que eu busque com qual valor e região?';
}
```

---

### 4. Buscar sem Filtro Exato de Quartos no Vista

**Problema**: O Vista filtra por `quartos = 3` exatamente, não `quartos >= 3`.

**Solução**: Remover filtro de quartos da API Vista e filtrar no código:

```javascript
// Em searchProperties, não enviar quartos para o Vista
// Filtrar depois no código:
const properties = result.filter(p => 
  !params.quartos || p.quartos >= params.quartos - 1 // aceita 1 quarto a menos
);
```

Ou alternativamente, aceitar casas com mais quartos (ex: pediu 3, mostrar de 4 também).

---

## Fluxo Corrigido para o Eduardo

```
Eduardo: "casa, 3 quartos, Campeche, até 7000"
    ↓
Sistema busca: Casa, Campeche, 3 quartos, R$7000
    ↓ 0 resultados
Sistema busca (fallback): Casa, Campeche, SEM quartos, R$7000
    ↓ 0 resultados
Sistema busca (fallback): Casa, SEM bairro, SEM quartos, R$7000
    ↓ 0 resultados

Helena: "Não encontrei casas até R$7000. O mais próximo que tenho 
        é uma casa de 4 quartos no Campeche por R$12.500. 
        Quer ver? Ou prefere ajustar o valor?"

Eduardo: "pode ser até 15 mil"
    ↓
Sistema detecta flexibilização: budget → 15000
Sistema atualiza lead_qualification
Sistema busca: Casa, Campeche, SEM quartos, R$15000
    ↓ 1 resultado!

Helena: "Encontrei uma casa de 4 quartos no Campeche por R$12.500! 🏠"
[envia imóvel]
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | Adicionar `searchPropertiesWithFallback()`, `detectFlexibilization()`, anti-repetição, e integrar no fluxo principal |

---

## Resumo Técnico

1. **`searchPropertiesWithFallback()`**: Tenta 3 níveis de busca (exata → sem quartos → sem bairro)
2. **`detectFlexibilization()`**: Detecta quando cliente está ajustando critérios explicitamente
3. **Anti-repetição**: Bloqueia envio de mensagem idêntica à anterior
4. **Mensagens contextuais**: Explica ao cliente por que está mostrando algo diferente do pedido
5. **Atualização forçada**: Permite sobrescrever dados quando é flexibilização explícita
