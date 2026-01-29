
# Plano: Corrigir Sistema de Qualificação - Salvar Dados Detectados

## Diagnóstico Confirmado

### 🔴 Problema Principal: Dados NUNCA são salvos
A função `getQualificationProgress()` apenas LÊ da tabela `lead_qualification`, mas **não existe nenhuma função que SALVE os dados detectados**.

**Evidência:**
```sql
SELECT * FROM lead_qualification WHERE phone_number = '554888182882'
-- Resultado: VAZIO []
```

Mesmo o cliente dizendo "apartamento de 2 quartos no centro até 8.000", nada é persistido.

### 🔴 Consequência: Anti-loop não funciona
O sistema anti-loop depende desses dados para saber o que já foi coletado. Como está sempre vazio, a IA sempre pergunta tudo de novo.

---

## Solução: Criar Sistema de Extração e Persistência

### 1. Nova Função: `extractQualificationData()`

Detecta automaticamente informações do texto do cliente:

```javascript
function extractQualificationData(message: string): Partial<QualificationData> {
  const data: Partial<QualificationData> = {};
  const lower = message.toLowerCase();
  
  // Detectar região/bairro
  const regionPatterns = [
    /(?:no|em|região|bairro)\s+(\w+(?:\s+\w+)?)/i,
    /(centro|beira.?mar|ingleses|jurerê|canasvieiras|lagoa|itacorubi|trindade|coqueiros|estreito|kobrasol|campinas|barreiros)/i
  ];
  for (const pattern of regionPatterns) {
    const match = message.match(pattern);
    if (match) {
      data.detected_neighborhood = match[1].trim();
      break;
    }
  }
  
  // Detectar tipo de imóvel
  const typePatterns = [
    /(apartamento|apto|casa|kitnet|studio|cobertura|sala\s+comercial|loja|terreno|sobrado)/i
  ];
  for (const pattern of typePatterns) {
    const match = message.match(pattern);
    if (match) {
      data.detected_property_type = match[1].trim();
      break;
    }
  }
  
  // Detectar número de quartos
  const bedroomPatterns = [
    /(\d+)\s*(?:quartos?|dormit[oó]rios?|qtos?|dorms?)/i,
    /(?:de|com)\s*(\d+)\s*q/i
  ];
  for (const pattern of bedroomPatterns) {
    const match = message.match(pattern);
    if (match) {
      data.detected_bedrooms = parseInt(match[1]);
      break;
    }
  }
  
  // Detectar orçamento
  const budgetPatterns = [
    /(?:até|ate|max|máximo|no máximo|R\$)\s*(\d+[.,]?\d*)\s*(?:mil|k)?/i,
    /(\d{4,})\s*(?:reais|R\$)?/i
  ];
  for (const pattern of budgetPatterns) {
    const match = message.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(',', '.'));
      // Se for "8 mil", multiplica por 1000
      if (/mil|k/i.test(message) && value < 100) {
        value *= 1000;
      }
      data.detected_budget_max = value;
      break;
    }
  }
  
  // Detectar interesse (morar/investir)
  if (/morar|moradia|próprio|residir/i.test(lower)) {
    data.detected_interest = 'morar';
  } else if (/invest|aluguel|renda|capital/i.test(lower)) {
    data.detected_interest = 'investir';
  }
  
  return data;
}
```

### 2. Nova Função: `updateQualificationData()`

Cria ou atualiza registro na tabela `lead_qualification`:

```javascript
async function updateQualificationData(
  supabase: any, 
  phoneNumber: string, 
  newData: Partial<QualificationData>
): Promise<void> {
  if (Object.keys(newData).length === 0) return;
  
  try {
    // Verificar se já existe registro
    const { data: existing } = await supabase
      .from('lead_qualification')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();
    
    const updatePayload = {
      ...newData,
      updated_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString()
    };
    
    if (existing?.id) {
      // Atualizar existente (merge com dados anteriores)
      await supabase
        .from('lead_qualification')
        .update(updatePayload)
        .eq('id', existing.id);
      console.log('📝 Lead qualification UPDATED:', newData);
    } else {
      // Criar novo
      await supabase
        .from('lead_qualification')
        .insert({
          phone_number: phoneNumber,
          qualification_status: 'qualifying',
          started_at: new Date().toISOString(),
          ...updatePayload
        });
      console.log('📝 Lead qualification CREATED:', newData);
    }
  } catch (error) {
    console.error('❌ Error updating qualification data:', error);
  }
}
```

### 3. Integrar no Fluxo Principal

No fluxo de processamento da mensagem (antes de gerar resposta da IA):

```javascript
// NOVO: Extrair e salvar dados de qualificação a cada mensagem
const extractedData = extractQualificationData(messageContent);
if (Object.keys(extractedData).length > 0) {
  await updateQualificationData(supabase, phoneNumber, extractedData);
  console.log('📊 Extracted qualification data:', extractedData);
}

// Agora carregar os dados atualizados
const { progress: qualProgress, data: qualData } = await getQualificationProgress(supabase, phoneNumber);
console.log(`📊 Qualification progress:`, qualProgress);
```

---

## Diagrama do Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────────┐
│              FLUXO DE QUALIFICAÇÃO CORRIGIDO                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [1] Cliente envia: "Quero apartamento 2 quartos no centro"    │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │ extractQualificationData(mensagem)    │ ← NOVO              │
│  │ → tipo: apartamento                   │                     │
│  │ → quartos: 2                          │                     │
│  │ → região: centro                      │                     │
│  └───────────────────────────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │ updateQualificationData(telefone)     │ ← NOVO              │
│  │ SALVA no lead_qualification           │                     │
│  └───────────────────────────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  [2] getQualificationProgress()                                │
│           │                                                     │
│           ▼                                                     │
│  ┌───────────────────────────────────────┐                     │
│  │ progress = {                          │                     │
│  │   has_region: TRUE    ← centro        │                     │
│  │   has_type: TRUE      ← apartamento   │                     │
│  │   has_bedrooms: TRUE  ← 2             │                     │
│  │   has_budget: FALSE   ← falta!        │                     │
│  │ }                                     │                     │
│  └───────────────────────────────────────┘                     │
│           │                                                     │
│           ▼                                                     │
│  [3] buildContextSummary() injeta no prompt:                   │
│      "📋 JÁ COLETADO: Centro, Apartamento, 2 quartos"          │
│           │                                                     │
│           ▼                                                     │
│  [4] IA gera resposta: "Qual sua faixa de preço?"              │
│      (NÃO pergunta região/tipo/quartos - já tem!)              │
│           │                                                     │
│           ▼                                                     │
│  [5] isLoopingQuestion() valida (backup extra)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Exemplo de Diálogo Após Correção

**Cliente:** "Quero um apartamento de 2 quartos no centro"
→ Sistema extrai: `{tipo: 'apartamento', quartos: 2, região: 'centro'}`
→ Sistema salva em `lead_qualification`

**Helena:** "Ótimo, Ian! 😊 Qual sua faixa de valor para o aluguel?"
→ Sistema injeta no prompt: "JÁ COLETADO: Centro, Apartamento, 2 quartos"
→ IA sabe que só falta orçamento

**Cliente:** "Pode ser até uns 8.000"
→ Sistema extrai: `{budget_max: 8000}`
→ Sistema atualiza `lead_qualification`

**Helena:** "Perfeito! Vou buscar as melhores opções pra você 🏠"
→ Sistema tem todos os dados → trigger buscar_imoveis

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/make-webhook/index.ts` | Adicionar `extractQualificationData()`, `updateQualificationData()`, integrar no fluxo principal |

---

## Resumo Técnico

1. **`extractQualificationData(message)`**: Detecta região, tipo, quartos, orçamento, interesse do texto
2. **`updateQualificationData(phone, data)`**: Salva/atualiza na tabela `lead_qualification`
3. **Integração**: Executar extração a cada mensagem recebida, ANTES de carregar o progress
4. **Resultado**: Anti-loop funciona porque agora tem dados persistidos para comparar
