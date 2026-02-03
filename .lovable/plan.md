
# Plano: Logs Detalhados para Diagnóstico de Busca Vista CRM

## Objetivo

Adicionar logs detalhados na função `vista-search-properties` para rastrear exatamente onde e por que imóveis estão sendo filtrados, permitindo identificar a causa de buscas retornando zero resultados com critérios aparentemente amplos.

---

## Problemas Atuais de Logging

### O que temos hoje
| Log Existente | Linha | Informação |
|---------------|-------|------------|
| `🏠 Vista CRM search params` | 54 | Parâmetros de entrada |
| `📤 Vista API request` | 115 | Payload enviado ao Vista |
| `📥 Vista API response status` | 131 | Status HTTP |
| `📥 Vista API response (first 500 chars)` | 132 | Preview da resposta |
| `📋 Processing X entries` | 153 | Quantidade de entries |
| `⏩ Skipping (quartos)` | 233 | Skip por quartos (único motivo detalhado) |
| `✅ Found X properties` | 272 | Resultado final |

### O que está faltando
- **Contadores de skip por motivo**: quantos imóveis foram descartados por cada filtro
- **Valores específicos**: qual valor o imóvel tinha vs qual era esperado
- **Preview de imóveis descartados**: amostra dos primeiros descartados
- **Debug do filtro de tipo**: categoria do Vista vs tipo solicitado
- **Debug de preços**: valores encontrados vs faixa esperada
- **Sumário final**: breakdown completo de filtragem

---

## Logs a Adicionar

### 1. Log de Configuração Inicial (após linha 54)
```typescript
console.log('🔧 Vista search config:', {
  tipoFilter: tipoFilter || 'nenhum',
  finalidade: params.finalidade || 'qualquer',
  precoRange: params.preco_min || params.preco_max 
    ? `R$${params.preco_min || 0} - R$${params.preco_max || '∞'}` 
    : 'sem limite',
  quartosFiltro: params.quartos || 'qualquer',
  bairro: params.bairro || 'qualquer',
  cidade: params.cidade || 'qualquer'
});
```

### 2. Contadores de Skip (estrutura de tracking)
```typescript
// Adicionar após linha 148
const skipReasons = {
  metadata: 0,        // paginas, total, status, etc.
  tipoMismatch: 0,    // categoria não bate
  noPrice: 0,         // sem preço disponível
  wrongFinalidade: 0, // sem valor para finalidade desejada
  bedroomMismatch: 0, // quartos não batem
  invalidObject: 0,   // objeto inválido
};
const skippedSamples: Array<{codigo: string, reason: string, details: string}> = [];
```

### 3. Log Detalhado em Cada Skip
```typescript
// Skip por metadata (linha 161-162)
if (codigo === 'paginas' || codigo === 'pagina' || ...) {
  skipReasons.metadata++;
  continue;
}

// Skip por objeto inválido (linha 156)
if (!imovel || typeof imovel !== 'object') {
  skipReasons.invalidObject++;
  continue;
}

// Skip por tipo (linha 166-174)
if (tipoFilter && !tipoMatches) {
  skipReasons.tipoMismatch++;
  if (skippedSamples.length < 3) {
    skippedSamples.push({
      codigo,
      reason: 'tipo',
      details: `Categoria Vista: "${categoria}" | Filtro: "${tipoFilter}"`
    });
  }
  continue;
}

// Skip por finalidade/preço (linhas 184-202)
if (params.finalidade === 'locacao' && valorLocacao === 0) {
  skipReasons.wrongFinalidade++;
  if (skippedSamples.length < 5) {
    skippedSamples.push({
      codigo,
      reason: 'sem_preco_locacao',
      details: `ValorVenda: R$${valorVenda} | ValorLocacao: R$${valorLocacao}`
    });
  }
  continue;
}

// Skip por quartos (linha 232-235)
if (params.quartos && dormitorios !== params.quartos) {
  skipReasons.bedroomMismatch++;
  if (skippedSamples.length < 5) {
    skippedSamples.push({
      codigo,
      reason: 'quartos',
      details: `Tem: ${dormitorios} | Quer: ${params.quartos}`
    });
  }
  continue;
}
```

### 4. Sumário Final Detalhado (antes da linha 272)
```typescript
console.log('📊 FILTER SUMMARY:', {
  totalFromVista: entries.length,
  skipped: {
    metadata: skipReasons.metadata,
    invalidObject: skipReasons.invalidObject,
    tipoMismatch: skipReasons.tipoMismatch,
    wrongFinalidade: skipReasons.wrongFinalidade,
    noPrice: skipReasons.noPrice,
    bedroomMismatch: skipReasons.bedroomMismatch,
    totalSkipped: Object.values(skipReasons).reduce((a, b) => a + b, 0)
  },
  passed: properties.length,
  limitApplied: params.limit || 3
});

if (properties.length === 0 && skippedSamples.length > 0) {
  console.log('🔍 ZERO RESULTS - Sample of skipped properties:', skippedSamples);
}
```

### 5. Log de Imóvel Aceito (opcional, verbose)
```typescript
// Após properties.push() (linha 266)
if (properties.length <= 3) {
  console.log(`✓ Accepted ${codigo}: ${prop.Categoria} | ${dormitorios}q | R$${preco}`);
}
```

### 6. Alerta Especial para Zero Resultados
```typescript
// Antes do return (linha 274)
if (properties.length === 0) {
  console.warn('⚠️ ZERO RESULTS ALERT:', {
    searchParams: params,
    vistaReturned: entries.length,
    allSkipReasons: skipReasons,
    samples: skippedSamples,
    suggestion: entries.length > 0 
      ? 'Vista retornou dados, mas todos foram filtrados. Verificar filtros client-side.'
      : 'Vista não retornou nenhum imóvel. Verificar filtros da API ou dados no CRM.'
  });
}
```

---

## Arquivo Modificado

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/vista-search-properties/index.ts` | +60 linhas de logs |

---

## Exemplo de Output Esperado

### Cenário: Busca por "Centro, 2 quartos, venda" retornando 0 resultados

```
🏠 Vista CRM search params: { tipo: "apartamento", bairro: "Centro", quartos: 2, finalidade: "venda" }
🔧 Vista search config: { tipoFilter: "apartamento", finalidade: "venda", precoRange: "sem limite", quartosFiltro: 2, bairro: "Centro" }
📤 Vista API request: { filter: { Bairro: "Centro", Dormitorios: [2,2] }, ... }
🔗 Calling Vista API (GET)
📥 Vista API response status: 200
📋 Processing 15 entries from Vista

📊 FILTER SUMMARY: {
  totalFromVista: 15,
  skipped: {
    metadata: 4,
    tipoMismatch: 3,
    wrongFinalidade: 5,
    bedroomMismatch: 3,
    totalSkipped: 15
  },
  passed: 0
}

🔍 ZERO RESULTS - Sample of skipped properties: [
  { codigo: "123", reason: "tipo", details: "Categoria Vista: 'Sala Comercial' | Filtro: 'apartamento'" },
  { codigo: "456", reason: "sem_preco_venda", details: "ValorVenda: R$0 | ValorLocacao: R$2500" },
  { codigo: "789", reason: "quartos", details: "Tem: 1 | Quer: 2" }
]

⚠️ ZERO RESULTS ALERT: {
  suggestion: "Vista retornou dados, mas todos foram filtrados. Verificar filtros client-side."
}
```

---

## Benefícios

1. **Diagnóstico preciso**: Saber exatamente qual filtro está descartando imóveis
2. **Amostras concretas**: Ver exemplos reais de imóveis descartados
3. **Detecção de problemas de dados**: Identificar se o Vista está retornando categorias/valores inesperados
4. **Alertas proativos**: Log especial quando zero resultados para facilitar busca nos logs
5. **Sugestões automáticas**: Indicar se o problema é no Vista ou nos filtros client-side

---

## Ordem de Implementação

1. Adicionar estrutura de contadores `skipReasons`
2. Modificar cada ponto de `continue` para incrementar contador correto
3. Adicionar coleta de amostras `skippedSamples`
4. Adicionar log de sumário final
5. Adicionar alerta especial para zero resultados
6. Deploy e teste

