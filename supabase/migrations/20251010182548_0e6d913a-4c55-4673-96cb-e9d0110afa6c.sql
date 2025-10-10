-- ============================================================================
-- FASE 1: MIGRAÇÃO RBAC - Sistema de Roles e Permissões
-- ============================================================================

-- 1.1 Criar enum com os 3 níveis de acesso
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'attendant');

-- 1.2 Criar tabela user_roles (separada de profiles para maior segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar índices para performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- 1.3 Migrar dados existentes da tabela profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 
       CASE 
         WHEN role = 'admin' THEN 'admin'::app_role
         ELSE 'attendant'::app_role
       END
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Remover coluna role da tabela profiles (após confirmar migração)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- ============================================================================
-- 1.4 Criar funções de segurança
-- ============================================================================

-- Função: Verificar se usuário tem uma role específica
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função: Retornar todas as roles de um usuário
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- Função: Verificar se usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role)
$$;

-- Função: Verificar se usuário atual é manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'manager'::app_role)
$$;

-- Função: Verificar se usuário atual é attendant
CREATE OR REPLACE FUNCTION public.is_attendant()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'attendant'::app_role)
$$;

-- Função: Verificar se pode gerenciar usuários (apenas admin)
CREATE OR REPLACE FUNCTION public.can_manage_users()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT is_admin()
$$;

-- ============================================================================
-- 1.5 RLS Policies para user_roles
-- ============================================================================

-- Admin pode ver todas as roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (is_admin());

-- Admin pode gerenciar roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Usuários podem ver suas próprias roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- 1.6 Atualizar RLS Policies existentes
-- ============================================================================

-- Campaigns: Admins e managers podem visualizar
DROP POLICY IF EXISTS "Authenticated users can view campaigns" ON public.campaigns;
CREATE POLICY "Admins and managers can view campaigns"
ON public.campaigns FOR SELECT
TO authenticated
USING (is_admin() OR is_manager());

-- Campaigns: Apenas admins podem gerenciar
DROP POLICY IF EXISTS "Admins can insert campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can delete campaigns" ON public.campaigns;

CREATE POLICY "Only admins can manage campaigns"
ON public.campaigns FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Contacts: Admins e managers podem editar
DROP POLICY IF EXISTS "Admins can update contacts" ON public.contacts;
CREATE POLICY "Admins and managers can update contacts"
ON public.contacts FOR UPDATE
TO authenticated
USING (is_admin() OR is_manager());

-- Contacts: Apenas admins podem deletar
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;
CREATE POLICY "Only admins can delete contacts"
ON public.contacts FOR DELETE
TO authenticated
USING (is_admin());

-- Contacts: Todos autenticados podem visualizar
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
CREATE POLICY "All authenticated can view contacts"
ON public.contacts FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Tickets: Atendentes podem criar tickets
DROP POLICY IF EXISTS "Admins can manage tickets" ON public.tickets;
CREATE POLICY "Authenticated users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Tickets: Apenas admins podem deletar
CREATE POLICY "Only admins can delete tickets"
ON public.tickets FOR DELETE
TO authenticated
USING (is_admin());

-- Tickets: Admins e managers veem todos, atendentes veem próprios
CREATE POLICY "Users can view tickets based on role"
ON public.tickets FOR SELECT
TO authenticated
USING (
  is_admin() OR is_manager() OR (is_attendant() AND assigned_to = auth.uid()::text)
);

-- Tickets: Admins e managers podem atualizar todos
CREATE POLICY "Admins and managers can update tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (is_admin() OR is_manager());