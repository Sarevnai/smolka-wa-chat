
# Plano: Adicionar Descrição dos Imóveis para Helena Consultiva

## Objetivo

Fazer com que a Helena tenha acesso às descrições dos imóveis retornadas pela API Vista, permitindo respostas mais consultivas e personalizadas para cada propriedade.

---

## Diagnóstico

### Situação Atual

| Componente | Status | Descrição |
|------------|--------|-----------|
| `vista-search-properties` | OK | Já busca `Descricao` (linha 102) |
| `vista-get-property` | OK | Já busca `Descricao` (linha 59) |
| `formatPropertyMessage()` (make-webhook) | **NÃO USA** | Não inclui descrição |
| `formatPropertyMessage()` (ai-virtual-agent) | **NÃO USA** | Não inclui descrição |
| Retorno para Make.com | **NÃO INCLUI** | Campo `descricao` não está no mapeamento |

### O Problema

A descrição do imóvel JÁ é retornada pela API Vista, mas está sendo **ignorada** em todas as formatações. A Helena vê apenas:
- Tipo + Bairro
- Quartos/Suítes
- Vagas
- Área
- Preço
- Link

**Não vê:** Vista para o mar, piscina, churrasqueira, reformado, mobiliado, etc.

---

## Solução Proposta

### 1. Atualizar `formatPropertyMessage()` no make-webhook

Adicionar a descrição de forma resumida (primeiros 150 caracteres):

```
🏠 *Apartamento em Canasvieiras*
• 2 quartos (1 suíte)
• 2 vagas
• 85m²
• R$ 3.500/mês
📝 Apartamento com vista mar, mobiliado, ar condicionado em todos...
🔗 smolkaimoveis.com.br/imovel/17346
```

### 2. Incluir descrição no retorno para Make.com

Adicionar o campo `descricao` no array `properties` retornado para o Make.com poder usar:

```typescript
properties: propertiesToSend.map(p => ({
  codigo: p.codigo,
  // ... outros campos
  descricao: p.descricao, // <- ADICIONAR
}))
```

### 3. Atualizar contexto no prompt da IA

Quando a IA recebe o contexto do imóvel (para links diretos), incluir a descrição para ela poder ser consultiva.

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/make-webhook/index.ts` | Atualizar `formatPropertyMessage()` para incluir descrição resumida; Adicionar `descricao` no retorno de properties |
| `supabase/functions/ai-virtual-agent/index.ts` | Atualizar `formatPropertyMessage()` e `formatPropertyDetailsLikeLais()` para incluir descrição |

---

## Detalhes Técnicos

### Função `formatPropertyMessage()` atualizada

```typescript
function formatPropertyMessage(property: any): string {
  const lines = [`🏠 *${property.tipo} em ${property.bairro}*`];
  
  if (property.quartos > 0) {
    const suiteText = property.suites > 0 ? ` (${property.suites} suíte${property.suites > 1 ? 's' : ''})` : '';
    lines.push(`• ${property.quartos} quarto${property.quartos > 1 ? 's' : ''}${suiteText}`);
  }
  if (property.vagas > 0) lines.push(`• ${property.vagas} vaga${property.vagas > 1 ? 's' : ''}`);
  if (property.area_util > 0) lines.push(`• ${property.area_util}m²`);
  lines.push(`• ${property.preco_formatado}`);
  if (property.valor_condominio > 0) {
    lines.push(`• Condomínio: ${formatCurrency(property.valor_condominio)}`);
  }
  
  // NOVA: Adicionar descrição resumida se disponível
  if (property.descricao && property.descricao.length > 0) {
    const descResumida = property.descricao.length > 150 
      ? property.descricao.substring(0, 150).trim() + '...'
      : property.descricao;
    lines.push(`📝 ${descResumida}`);
  }
  
  lines.push(`🔗 ${property.link}`);
  
  return lines.join('\n');
}
```

### Retorno atualizado para Make.com

```typescript
properties: propertiesToSend.map(p => ({
  codigo: p.codigo,
  foto_destaque: p.foto_destaque,
  tipo: p.tipo,
  bairro: p.bairro,
  quartos: p.quartos,
  preco_formatado: p.preco_formatado,
  link: p.link,
  area_util: p.area_util,
  vagas: p.vagas,
  valor_condominio: p.valor_condominio,
  descricao: p.descricao // <- ADICIONAR
}))
```

---

## Benefícios

1. **Helena mais consultiva**: Pode mencionar diferenciais como "vista mar", "churrasqueira", "piscina"
2. **Respostas personalizadas**: "Esse apartamento tem ar condicionado em todos os cômodos, ideal para o verão de Floripa!"
3. **Make.com**: Pode usar descrição nos captions das imagens
4. **Sem custo adicional**: A informação já está sendo buscada, só não estava sendo usada

---

## Limite de Caracteres

Para não poluir as mensagens, a descrição será:
- Truncada em 150 caracteres para mensagens WhatsApp
- Completa no contexto interno da IA (para ela usar em respostas consultivas)
