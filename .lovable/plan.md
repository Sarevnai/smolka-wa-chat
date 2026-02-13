

# Plano de Correcoes UX/UI - aimee.ai

## Escopo

5 correcoes priorizadas pela auditoria UX/UI, organizadas por impacto e complexidade.

---

## 1. Corrigir cores hardcoded no ConversationItem (dark mode quebrado)

**Problema:** O componente `ConversationItem.tsx` usa classes como `text-gray-900`, `text-gray-500`, `text-gray-600` que ficam invisiveis no dark mode.

**Solucao:** Substituir por tokens semanticos do Tailwind:

| De | Para |
|----|------|
| `text-gray-900` | `text-foreground` |
| `text-gray-600` | `text-muted-foreground` |
| `text-gray-500` | `text-muted-foreground` |
| `bg-gray-400` | `bg-muted-foreground` |
| `bg-orange-500` / `bg-yellow-500` (avatar) | Manter (sao cores de status, nao de texto) |

**Arquivo:** `src/components/chat/ConversationItem.tsx` (linhas 199-316)

---

## 2. Remover landing page publica e redirecionar para /auth

**Problema:** A rota `/` exibe informacoes internas (nome da imobiliaria, descricao do sistema) para usuarios nao autenticados. Isso e um risco de privacidade e nao tem utilidade real.

**Solucao:** No componente `Index.tsx`, quando `!user`, redirecionar para `/auth` em vez de mostrar a landing page com hero e features cards.

**Arquivo:** `src/pages/Index.tsx` - remover o bloco de linhas 80-144 (hero + features) e substituir por um `Navigate to="/auth"`.

---

## 3. Ativar drag-and-drop no Kanban Pipeline

**Problema:** O `@dnd-kit` ja esta instalado mas o KanbanBoard nao usa. As conversas nao podem ser arrastadas entre colunas, apesar da prop `onMoveConversation` existir e a funcao `moveConversation` estar implementada no hook.

**Solucao:** Integrar `DndContext`, `DragOverlay` e `useDroppable` no KanbanBoard:

- Envolver o board com `DndContext` com sensor de pointer
- Cada `StageColumn` vira um `useDroppable` com id do stage
- Cada `ConversationCard` vira `useDraggable` com id da conversa
- No `onDragEnd`, chamar `onMoveConversation(conversationId, newStageId)`
- Adicionar `DragOverlay` com preview do card

**Arquivo:** `src/components/pipeline/KanbanBoard.tsx`

---

## 4. Busca global com Cmd+K

**Problema:** Nao ha como buscar leads/conversas rapidamente. O corretor precisa navegar manualmente pela lista.

**Solucao:** Criar um componente `GlobalSearch` usando o `cmdk` (ja instalado) e o `CommandDialog` que ja existe em `src/components/ui/command.tsx`.

- Criar `src/components/search/GlobalSearch.tsx`
- Abrir com `Cmd+K` / `Ctrl+K` (adicionar ao `useKeyboardShortcuts`)
- Buscar em `contacts` (nome, telefone) e `conversations` (ultimo msg)
- Ao selecionar, navegar para `/chat/{phone}`
- Integrar no header do `Layout.tsx` (botao de busca + atalho)

**Arquivos:**
- Novo: `src/components/search/GlobalSearch.tsx`
- Editar: `src/components/Layout.tsx` (adicionar botao e componente)
- Editar: `src/hooks/useKeyboardShortcuts.ts` (adicionar atalho Cmd+K)

---

## 5. Header contextual com badge de departamento

**Problema:** O header mostra "Central de atendimento" estaticamente. O usuario nao tem feedback visual de qual setor esta ativo.

**Solucao:** No `Layout.tsx`, substituir o titulo fixo por um indicador dinamico:

- Mostrar badge colorido do departamento ativo (usando cores do `sidebarConfig`)
- Exibir nome do departamento ao lado do titulo
- Para admin, mostrar "Admin" com icone de coroa

**Arquivo:** `src/components/Layout.tsx` (linhas 61-68)

---

## Resumo de arquivos

| Arquivo | Acao | Prioridade |
|---------|------|-----------|
| `src/components/chat/ConversationItem.tsx` | Corrigir cores hardcoded | Alta |
| `src/pages/Index.tsx` | Remover landing publica, redirect /auth | Alta |
| `src/components/pipeline/KanbanBoard.tsx` | Ativar drag-and-drop | Media |
| `src/components/search/GlobalSearch.tsx` | Criar busca Cmd+K | Media |
| `src/components/Layout.tsx` | Header contextual + integrar busca | Media |
| `src/hooks/useKeyboardShortcuts.ts` | Atalho Cmd+K | Baixa |

## Ordem de implementacao

1. Cores do ConversationItem (fix rapido, alto impacto no dark mode)
2. Redirect da landing page (seguranca)
3. Header contextual (feedback visual)
4. Drag-and-drop no Kanban (funcionalidade)
5. Busca global Cmd+K (produtividade)

