
# Plano: Corrigir Erro `qualProgress is not defined` no Make-Webhook

## Diagnóstico

### Causa Raiz
O erro `ReferenceError: qualProgress is not defined` ocorre devido a um **problema de escopo de variáveis**.

### Estrutura Atual do Código (Problemática)

```
if (isAwaitingFeedback && pendingProperties.length > 0) {
  // BLOCO A - Processamento de feedback
  const { data: qualData } = await getQualificationProgress(...);  // ⚠️ Só qualData!
  
} else {
  // BLOCO B - Fluxo normal
  const { progress: qualProgress, data: qualData } = await getQualificationProgress(...);
}

// FORA DOS BLOCOS (linha 3129-3158):
// ===== ANTI-REPETITION CHECK =====
if (hasMinimumCriteriaToSearch(currentDepartment, qualProgress)) {  // ❌ ERRO!
  const searchParams = buildSearchParamsFromQualification(currentDepartment, qualData);
}
```

### Cenário do Erro
1. Cliente está em `isAwaitingFeedback=true` (dando feedback sobre um imóvel)
2. Código entra no Bloco A (linhas 2853-2938)
3. `qualProgress` **nunca é definida** neste caminho
4. Código sai do bloco if/else e chega na anti-repetição
5. Linha 3136 tenta usar `qualProgress` → **ReferenceError**

---

## Solução

### Mover a definição de `qualProgress` e `qualData` para ANTES do if/else

| Antes | Depois |
|-------|--------|
| Variáveis definidas dentro de blocos separados | Variáveis definidas uma vez no escopo superior |

### Mudanças no Código

**Arquivo**: `supabase/functions/make-webhook/index.ts`

**Antes** (linhas ~2847-2943):
```typescript
// Check for consultative flow state
const consultativeState = await getConsultativeState(...);
const isAwaitingFeedback = ...;

if (isAwaitingFeedback && pendingProperties.length > 0) {
  // ... código que usa qualData localmente
  const { data: qualData } = await getQualificationProgress(...);
  
} else {
  // Normal flow
  const { progress: qualProgress, data: qualData } = await getQualificationProgress(...);
}
```

**Depois**:
```typescript
// Check for consultative flow state
const consultativeState = await getConsultativeState(...);
const isAwaitingFeedback = ...;

// ===== CARREGAR DADOS DE QUALIFICAÇÃO NO ESCOPO SUPERIOR =====
const { progress: qualProgress, data: qualData } = await getQualificationProgress(supabase, phoneNumber);
console.log(`📊 Qualification progress:`, qualProgress);

if (isAwaitingFeedback && pendingProperties.length > 0) {
  // ... usar qualData já definido
  
} else {
  // Normal flow - qualProgress e qualData já disponíveis
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/make-webhook/index.ts` | Mover definição de `qualProgress`/`qualData` para antes do if/else (linha ~2852) |

---

## Detalhes da Implementação

### 1. Adicionar definição no escopo superior (linha ~2852)

Adicionar após a linha que define `currentIndex`:
```typescript
const currentIndex = consultativeState?.current_property_index || 0;

// ===== LOAD QUALIFICATION DATA FOR ALL PATHS =====
const { progress: qualProgress, data: qualData } = await getQualificationProgress(supabase, phoneNumber);
console.log(`📊 Qualification progress:`, qualProgress);
```

### 2. Remover definição duplicada do bloco else (linha ~2943)

Remover estas linhas do bloco else:
```typescript
// ❌ REMOVER - Agora está no escopo superior
const { progress: qualProgress, data: qualData } = await getQualificationProgress(supabase, phoneNumber);
console.log(`📊 Qualification progress:`, qualProgress);
```

### 3. Remover definição local do bloco if (linha ~2875)

Alterar de:
```typescript
const { data: qualData } = await getQualificationProgress(supabase, phoneNumber);
```
Para usar a variável já existente (ou remover se não houver uso diferente).

---

## Benefícios

1. **Corrige o erro imediato**: `qualProgress` sempre existirá quando o código de anti-repetição executar
2. **Evita chamadas duplicadas**: A função `getQualificationProgress` é chamada apenas uma vez
3. **Código mais limpo**: Variáveis disponíveis em todo o escopo do triage completed

---

## Validação

Após a correção, verificar nos logs:
- Não deve haver mais `ReferenceError: qualProgress is not defined`
- O log `📊 Qualification progress:` deve aparecer em todos os cenários
- O fluxo de anti-repetição deve funcionar corretamente
