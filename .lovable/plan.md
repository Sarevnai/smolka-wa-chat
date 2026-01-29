
# Plano: Melhorias no Fluxo de Atendimento da Helena

## Resumo das Mudanças

Implementar 3 melhorias críticas para tornar o atendimento mais humano e evitar loops:

1. **Detecção de flexibilização de preço** - Quando cliente diz "pode ser mais caro" sem valor
2. **Fluxo progressivo com perguntas fragmentadas** - Uma pergunta por vez
3. **Anti-loop** - Evitar repetição de perguntas já respondidas

---

## 1. Detectar Flexibilização de Preço

### Problema Atual
Quando o cliente responde "pode ser mais caro" após não encontrar imóveis, a IA não sabe como reagir porque nenhum valor novo foi especificado.

### Solução
Adicionar função `detectPriceFlexibility` que identifica intenção de flexibilizar sem valor definido:

```javascript
function detectPriceFlexibility(message: string): { 
  type: 'increase' | 'decrease' | 'none';
  hasNewValue: boolean;
  suggestedQuestion: string | null;
} {
  const lower = message.toLowerCase();
  
  // Padrões de aumento de preço SEM valor específico
  const increaseNoValue = /pode ser mais caro|aceito pagar mais|flexivel|flexível|aumento|valor maior|preço maior/i;
  
  // Padrões de diminuição SEM valor específico  
  const decreaseNoValue = /mais barato|menos|menor valor|mais em conta|orçamento menor/i;
  
  // Verifica se tem valor numérico
  const hasValue = /\d+\s*(mil|k|reais|R\$|\$)/i.test(message) || /\d{4,}/i.test(message);
  
  if (increaseNoValue.test(lower) && !hasValue) {
    return {
      type: 'increase',
      hasNewValue: false,
      suggestedQuestion: 'Até quanto você considera pagar? Assim consigo buscar opções melhores pra você 😊'
    };
  }
  
  if (decreaseNoValue.test(lower) && !hasValue) {
    return {
      type: 'decrease', 
      hasNewValue: false,
      suggestedQuestion: 'Qual seria o valor máximo ideal pra você? 😊'
    };
  }
  
  return { type: 'none', hasNewValue: hasValue, suggestedQuestion: null };
}
```

### Integração no Fluxo (linha ~1904)
Adicionar verificação antes de processar feedback negativo:

```javascript
// Antes de processar como feedback negativo normal
const priceFlexibility = detectPriceFlexibility(messageContent);
if (priceFlexibility.type !== 'none' && !priceFlexibility.hasNewValue) {
  // Cliente quer flexibilizar mas não deu valor
  aiResponse = priceFlexibility.suggestedQuestion;
  // NÃO mostrar próximo imóvel ainda - aguardar valor
  return; // Sair do fluxo de feedback
}
```

---

## 2. Fluxo Progressivo com Perguntas Fragmentadas

### Problema Atual
A IA às vezes faz várias perguntas de uma vez (região + tipo + quartos), tornando o atendimento robótico.

### Solução
Criar sistema de "qualification_stage" para rastrear quais informações já foram coletadas:

```javascript
interface QualificationProgress {
  has_region: boolean;
  has_type: boolean;
  has_bedrooms: boolean;
  has_budget: boolean;
  has_purpose: boolean; // morar/investir (para vendas)
}

async function getQualificationProgress(supabase: any, phoneNumber: string): Promise<QualificationProgress> {
  const { data } = await supabase
    .from('lead_qualification')
    .select('detected_neighborhood, detected_property_type, detected_bedrooms, detected_budget_max, detected_interest')
    .eq('phone_number', phoneNumber)
    .maybeSingle();
    
  return {
    has_region: !!data?.detected_neighborhood,
    has_type: !!data?.detected_property_type,
    has_bedrooms: !!data?.detected_bedrooms,
    has_budget: !!data?.detected_budget_max,
    has_purpose: !!data?.detected_interest
  };
}

function getNextQualificationQuestion(progress: QualificationProgress, department: string): string | null {
  // Para LOCAÇÃO - ordem: região → tipo → quartos → orçamento
  if (department === 'locacao') {
    if (!progress.has_region) return '📍 Qual região de Florianópolis você prefere?';
    if (!progress.has_type) return '🏠 Você busca apartamento, casa ou outro tipo?';
    if (!progress.has_bedrooms) return '🛏️ Quantos quartos você precisa?';
    if (!progress.has_budget) return '💰 Qual sua faixa de valor para o aluguel?';
    return null; // Pode buscar
  }
  
  // Para VENDAS - ordem: objetivo → região → tipo → quartos → orçamento
  if (department === 'vendas') {
    if (!progress.has_purpose) return 'Você está buscando para *morar* ou para *investir*?';
    if (!progress.has_region) return '📍 Qual região de Florianópolis te interessa?';
    if (!progress.has_type) return '🏠 Que tipo de imóvel você busca?';
    if (!progress.has_bedrooms) return '🛏️ Quantos quartos são ideais pra você?';
    if (!progress.has_budget) return '💰 Qual faixa de investimento você considera?';
    return null;
  }
  
  return null;
}
```

### Atualizar Prompts para Reforçar

Adicionar nos prompts `buildLocacaoPrompt` e `buildVendasPrompt`:

```text
⚡ REGRA DE OURO - UMA PERGUNTA POR VEZ:
- NUNCA faça 2 perguntas na mesma mensagem
- Se falta região, pergunte APENAS região
- Se falta tipo, pergunte APENAS tipo
- Após cada resposta, faça a PRÓXIMA pergunta
- Só busque imóveis quando tiver 2+ critérios

💬 EXEMPLOS CORRETOS:
- ✅ "Qual região você prefere?"
- ✅ "Quantos quartos você precisa?"
- ❌ "Qual região e quantos quartos?" (ERRADO - 2 perguntas)
```

---

## 3. Sistema Anti-Loop

### Problema Atual
A IA repete perguntas já respondidas porque não lembra o contexto.

### Solução A: Injetar Contexto Explícito no Prompt

Criar função para gerar resumo do que já foi coletado:

```javascript
function buildContextSummary(qualification: QualificationProgress, qualificationData: any): string {
  const collected: string[] = [];
  
  if (qualificationData?.detected_neighborhood) {
    collected.push(`📍 Região: ${qualificationData.detected_neighborhood}`);
  }
  if (qualificationData?.detected_property_type) {
    collected.push(`🏠 Tipo: ${qualificationData.detected_property_type}`);
  }
  if (qualificationData?.detected_bedrooms) {
    collected.push(`🛏️ Quartos: ${qualificationData.detected_bedrooms}`);
  }
  if (qualificationData?.detected_budget_max) {
    collected.push(`💰 Orçamento: até R$ ${qualificationData.detected_budget_max}`);
  }
  if (qualificationData?.detected_interest) {
    collected.push(`🎯 Objetivo: ${qualificationData.detected_interest}`);
  }
  
  if (collected.length === 0) return '';
  
  return `
📋 DADOS JÁ COLETADOS (NÃO PERGUNTE DE NOVO):
${collected.join('\n')}
`;
}
```

### Solução B: Adicionar Nos Prompts

No início dos prompts, adicionar dinamicamente:

```javascript
function buildLocacaoPrompt(config, contactName, history, qualificationData) {
  const contextSummary = buildContextSummary(qualificationData);
  
  return `🚨 REGRA ZERO: Você é ${config.agent_name}...
  
${contextSummary}

⛔ ANTI-LOOP - LEIA COM ATENÇÃO:
- Se dados acima mostram "Região: Centro", NÃO pergunte região
- Se dados mostram "Quartos: 2", NÃO pergunte quartos
- NUNCA repita uma pergunta já respondida
- Se cliente já disse algo, use essa informação

...resto do prompt...`;
}
```

### Solução C: Detectar Loops em Tempo Real

Adicionar função para verificar se a resposta da IA contém pergunta já respondida:

```javascript
function isLoopingQuestion(aiResponse: string, qualificationData: any): boolean {
  const lower = aiResponse.toLowerCase();
  
  // Se já tem região e IA perguntou região novamente
  if (qualificationData?.detected_neighborhood) {
    if (/qual\s+(regi[aã]o|bairro)|onde\s+voc[eê]|localiza[cç][aã]o/i.test(lower)) {
      console.log('⚠️ Loop detected: asking region again');
      return true;
    }
  }
  
  if (qualificationData?.detected_bedrooms) {
    if (/quantos?\s+quartos?|n[uú]mero\s+de\s+(quartos?|dormit[oó]rios?)/i.test(lower)) {
      console.log('⚠️ Loop detected: asking bedrooms again');
      return true;
    }
  }
  
  if (qualificationData?.detected_budget_max) {
    if (/faixa\s+de\s+(valor|pre[cç]o)|or[cç]amento|quanto\s+(quer|pode)\s+pagar/i.test(lower)) {
      console.log('⚠️ Loop detected: asking budget again');
      return true;
    }
  }
  
  return false;
}

// No fluxo principal, após obter resposta da IA:
if (isLoopingQuestion(aiResponse, qualificationData)) {
  // Substituir por resposta genérica e avançar
  const nextQuestion = getNextQualificationQuestion(progress, currentDepartment);
  if (nextQuestion) {
    aiResponse = nextQuestion;
  } else {
    aiResponse = 'Perfeito! Com essas informações, vou buscar as melhores opções pra você 😊';
    // Trigger property search
  }
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | Adicionar funções e lógica anti-loop |

---

## Diagrama do Novo Fluxo

```text
┌─────────────────────────────────────────────────────────────────┐
│                 FLUXO PROGRESSIVO ANTI-LOOP                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] Cliente envia mensagem                                     │
│           │                                                     │
│           ▼                                                     │
│  [2] Carregar qualification_data do banco                       │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │ Gerar CONTEXT_SUMMARY                 │                     │
│  │ "📋 JÁ COLETADO: Centro, 2 quartos"   │                     │
│  └───────────────────────────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  [3] Injetar no prompt da IA                                   │
│           │                                                     │
│           ▼                                                     │
│  [4] IA gera resposta                                          │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │ isLoopingQuestion(resposta)?          │                     │
│  └───────────────────────────────────────┘                     │
│        │                    │                                   │
│      [SIM]                [NÃO]                                 │
│        │                    │                                   │
│        ▼                    ▼                                   │
│  ┌─────────────┐    ┌─────────────────┐                        │
│  │ Substituir  │    │ Verificar       │                        │
│  │ por próxima │    │ flexibilidade   │                        │
│  │ pergunta    │    │ de preço        │                        │
│  └─────────────┘    └─────────────────┘                        │
│                            │                                    │
│                     ┌──────┴──────┐                            │
│                     │             │                             │
│              [TEM VALOR]   [SEM VALOR]                         │
│                     │             │                             │
│                     ▼             ▼                             │
│              Processar      "Até quanto                         │
│              normalmente    você considera?"                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Exemplos de Diálogo Esperado

### Antes (Problemático):
```
Helena: "Qual região, quantos quartos e qual sua faixa de preço?"
Cliente: "Centro"
Helena: "Qual região você prefere?" ← LOOP!
```

### Depois (Corrigido):
```
Helena: "Qual região você prefere?"
Cliente: "Centro"
Helena: "Ótimo! E quantos quartos você precisa?"
Cliente: "2 quartos"
Helena: "Perfeito! Qual sua faixa de valor para o aluguel?"
Cliente: "Até 3 mil"
Helena: "Encontrei um imóvel que pode combinar! 🏠"
```

### Flexibilização de Preço:
```
Helena: "Poxa, não encontrei com esses critérios 😔"
Cliente: "Pode ser mais caro"
Helena: "Até quanto você considera pagar? 😊"
Cliente: "Até 4 mil"
Helena: "Encontrei uma opção interessante! 🏠"
```

---

## Resumo Técnico

1. **`detectPriceFlexibility()`** - Detecta quando cliente quer flexibilizar preço sem dar valor
2. **`getQualificationProgress()`** - Carrega o que já foi coletado do banco
3. **`getNextQualificationQuestion()`** - Retorna a próxima pergunta na sequência
4. **`buildContextSummary()`** - Gera resumo do contexto para o prompt
5. **`isLoopingQuestion()`** - Detecta se IA está repetindo pergunta
6. **Atualizar prompts** - Reforçar regra "uma pergunta por vez"
