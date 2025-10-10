# Sistema RBAC - Guia de Permissões

## Visão Geral

O sistema utiliza **Role-Based Access Control (RBAC)** com três níveis de acesso:

### Níveis de Acesso

#### 🔴 Administrador (`admin`)
- **Acesso total** à plataforma
- Pode gerenciar usuários e permissões
- Acesso a todas as configurações sensíveis
- Pode criar, editar e deletar todos os recursos

#### 🟡 Gerente (`manager`)
- **Acesso operacional** completo
- Visualiza todos os dados e relatórios (exceto financeiros)
- Pode editar contatos e tickets
- Não pode alterar configurações ou gerenciar usuários

#### 🟢 Atendente (`attendant`)
- **Acesso restrito** ao atendimento
- Apenas visualização de contatos e conversas
- Pode enviar mensagens e criar tickets
- Não pode deletar ou alterar dados críticos

---

## Estrutura do Banco de Dados

### Tabela: `user_roles`

```sql
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    role app_role NOT NULL,  -- 'admin' | 'manager' | 'attendant'
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### Funções de Segurança

```sql
-- Verificar role específica
has_role(user_id UUID, role app_role) RETURNS BOOLEAN

-- Verificar role do usuário atual
is_admin() RETURNS BOOLEAN
is_manager() RETURNS BOOLEAN
is_attendant() RETURNS BOOLEAN
```

---

## Como Usar no Frontend

### 1. Hook `usePermissions`

```typescript
import { usePermissions } from '@/hooks/usePermissions';

function MyComponent() {
  const permissions = usePermissions();

  return (
    <>
      {/* Verificar role específica */}
      {permissions.isAdmin && <AdminPanel />}
      
      {/* Verificar permissão específica */}
      {permissions.canEditContacts && (
        <Button>Editar Contato</Button>
      )}
      
      {/* Exibir badge de role */}
      <Badge>{permissions.roles.join(', ')}</Badge>
    </>
  );
}
```

### 2. Componente `RoleGuard`

```typescript
import { RoleGuard } from '@/components/guards/RoleGuard';

// Por role
<RoleGuard allowedRoles={['admin', 'manager']}>
  <SensitiveComponent />
</RoleGuard>

// Por permissão
<RoleGuard requiredPermission="canDeleteContacts">
  <DeleteButton />
</RoleGuard>
```

### 3. Proteger Rotas

```typescript
import ProtectedRoute from '@/components/ProtectedRoute';

<Route path="/admin" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminPage />
  </ProtectedRoute>
} />
```

---

## Matriz de Permissões

| Funcionalidade | Admin | Manager | Attendant |
|---|---|---|---|
| **Dashboard** | ✅ | ✅ | ❌ |
| **Chat - Visualizar** | ✅ | ✅ | ✅ |
| **Chat - Enviar** | ✅ | ✅ | ✅ |
| **Chat - Deletar** | ✅ | ❌ | ❌ |
| **Contatos - Visualizar** | ✅ | ✅ | ✅ |
| **Contatos - Editar** | ✅ | ✅ | ❌ |
| **Contatos - Deletar** | ✅ | ❌ | ❌ |
| **Campanhas - Visualizar** | ✅ | ✅ | ❌ |
| **Campanhas - Criar/Enviar** | ✅ | ❌ | ❌ |
| **Relatórios** | ✅ | ✅ | ❌ |
| **Relatórios Financeiros** | ✅ | ❌ | ❌ |
| **Integrações** | ✅ | ❌ | ❌ |
| **Configurações** | ✅ | ❌ | ❌ |
| **Gerenciar Usuários** | ✅ | ❌ | ❌ |
| **Tickets - Criar** | ✅ | ✅ | ✅ |
| **Tickets - Deletar** | ✅ | ❌ | ❌ |

---

## Adicionar Nova Permissão

### 1. Adicionar na interface `RolePermissions`

```typescript
// src/types/roles.ts
export interface RolePermissions {
  // ... existing permissions
  canExportData: boolean;  // Nova permissão
}
```

### 2. Atualizar lógica no hook

```typescript
// src/hooks/usePermissions.ts
const permissions = useMemo((): RolePermissions => {
  if (isAdmin) {
    return {
      // ... existing
      canExportData: true,
    };
  }
  // ... other roles
}, [isAdmin, isManager, isAttendant]);
```

### 3. Usar no componente

```typescript
const permissions = usePermissions();

{permissions.canExportData && (
  <Button onClick={handleExport}>
    Exportar Dados
  </Button>
)}
```

---

## Adicionar Nova Rota Protegida

```typescript
// src/App.tsx
<Route path="/new-route" element={
  <ProtectedRoute 
    allowedRoles={['admin', 'manager']}
    // ou
    requiredPermission="canAccessNewFeature"
  >
    <NewPage />
  </ProtectedRoute>
} />
```

---

## Atualizar RLS Policy

```sql
-- Exemplo: Nova tabela com permissões diferenciadas
CREATE TABLE public.new_table (
  id UUID PRIMARY KEY,
  -- ... columns
);

ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Admins têm acesso total
CREATE POLICY "Admins can manage new_table"
ON public.new_table FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Managers podem visualizar
CREATE POLICY "Managers can view new_table"
ON public.new_table FOR SELECT
TO authenticated
USING (is_manager());

-- Attendants não têm acesso (sem policy)
```

---

## Boas Práticas

### ✅ DO

- Use `usePermissions()` para verificações condicionais
- Proteja rotas sensíveis com `ProtectedRoute`
- Use `RoleGuard` para componentes específicos
- Mantenha RLS policies atualizadas no banco
- Documente novas permissões neste arquivo

### ❌ DON'T

- Não confie apenas em verificações frontend (sempre use RLS)
- Não exponha dados sensíveis via API sem verificação
- Não use hardcoded roles (use `usePermissions`)
- Não duplique lógica de permissões em múltiplos lugares

---

## Gerenciamento de Usuários

### Como alterar role de um usuário

1. Acesse `/users` (apenas admins)
2. Selecione o usuário na tabela
3. Escolha a nova role no dropdown
4. A mudança é aplicada imediatamente

### Via SQL (emergência)

```sql
-- Remover role antiga
DELETE FROM public.user_roles WHERE user_id = 'USER_UUID';

-- Adicionar nova role
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_UUID', 'admin');
```

---

## Troubleshooting

### Usuário não consegue acessar funcionalidade

1. Verificar role em `user_roles`: `SELECT * FROM user_roles WHERE user_id = 'UUID';`
2. Testar funções: `SELECT is_admin(), is_manager(), is_attendant();`
3. Verificar RLS policies da tabela
4. Confirmar que o frontend usa `usePermissions()` corretamente

### Policy retorna false quando deveria retornar true

- Verificar se a função `is_admin()` etc está usando `auth.uid()` corretamente
- Confirmar que `user_roles` tem registro correto
- Testar policy manualmente: `SELECT * FROM table WHERE <policy_condition>;`

---

## Referências

- **Hook principal**: `src/hooks/usePermissions.ts`
- **Tipos**: `src/types/roles.ts`
- **Guard**: `src/components/guards/RoleGuard.tsx`
- **Página Admin**: `src/pages/UserManagement.tsx`
- **Funções DB**: Migrations em `supabase/migrations/`
