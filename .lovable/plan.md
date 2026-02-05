
# Correção: Função `getPropertyByListingId` Faltando

## Diagnóstico do Erro

O `make-webhook` está falhando ao iniciar porque:

1. **Linha 64** de `make-webhook/index.ts` importa `getPropertyByListingId` de `_shared/property.ts`
2. Essa função **NÃO existe** em `_shared/property.ts`
3. A função existe em `ai-virtual-agent/index.ts` (linhas 1451-1470), mas **não foi migrada** durante a modularização

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ ERRO: The requested module '../_shared/property.ts' does not provide an    │
│       export named 'getPropertyByListingId'                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Solução

Adicionar a função `getPropertyByListingId` ao arquivo `_shared/property.ts`.

### Implementação da Função

```typescript
// ========== PROPERTY BY LISTING ID ==========

export async function getPropertyByListingId(
  supabase: any,
  listingId: string
): Promise<any | null> {
  try {
    console.log(`🏠 Fetching property by listing ID: ${listingId}`);
    
    const { data, error } = await supabase.functions.invoke('vista-get-property', {
      body: { codigo: listingId }
    });
    
    if (error || !data?.success) {
      console.log(`⚠️ Property not found for listing ID: ${listingId}`, error || data?.error);
      return null;
    }
    
    console.log(`✅ Found property:`, data.property);
    return data.property;
  } catch (e) {
    console.error(`❌ Error fetching property ${listingId}:`, e);
    return null;
  }
}
```

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/property.ts` | Adicionar função `getPropertyByListingId` |

---

## Nota Técnica

A função usa a Edge Function `vista-get-property` que já existe no projeto. A assinatura foi adaptada para receber o `supabase` client como parâmetro (padrão dos módulos compartilhados), diferente da versão original em `ai-virtual-agent` que usa um client global.
