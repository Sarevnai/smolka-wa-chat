

# Remover aba "Contatos" dos setores Locação e Vendas

## Contexto

Nos setores de Locação e Vendas, o foco é em **leads** (gerenciados via pipeline e chat), não em contatos avulsos. A aba "Contatos" só faz sentido no **Administrativo** (gestão geral) e no **Marketing** (listas de contatos para campanhas).

## Alteração

**Arquivo:** `src/lib/sidebarConfig.ts`

Remover o item `{ title: 'Contatos', url: '/contacts', icon: Users }` dos arrays `items` de:
- `locacao` (linha com Contatos)
- `vendas` (linha com Contatos)

Manter nos setores `administrativo` e `marketing`.

### Resultado esperado

| Setor | Contatos visível? |
|-------|-------------------|
| Locação | Não |
| Vendas | Não |
| Administrativo | Sim |
| Marketing | Sim |

