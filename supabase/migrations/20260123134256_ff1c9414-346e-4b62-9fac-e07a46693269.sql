-- =============================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA
-- =============================================

-- 1. Corrigir função sem search_path definido
CREATE OR REPLACE FUNCTION public.update_ai_behavior_config_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================
-- 2. CORRIGIR RLS DA TABELA MESSAGES (CRÍTICO)
-- Problema: Qualquer usuário autenticado pode ler TODAS as mensagens
-- =============================================

-- Remover policy permissiva atual
DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON public.messages;

-- Criar policy restritiva baseada em departamento
CREATE POLICY "Users can view messages from their department"
ON public.messages
FOR SELECT
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.department_code = get_user_department(auth.uid())
      OR c.assigned_to = auth.uid()
    )
  )
  OR (conversation_id IS NULL AND is_admin())
);

-- =============================================
-- 3. CORRIGIR RLS DA TABELA CONVERSATIONS
-- Problema: Conversas com department_code IS NULL ficam visíveis para todos
-- =============================================

-- Remover policies atuais
DROP POLICY IF EXISTS "Users can view conversations in their department" ON public.conversations;
DROP POLICY IF EXISTS "Users can update conversations in their department" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete conversations in their department" ON public.conversations;

-- SELECT: Apenas admins veem conversas sem departamento (triagem)
CREATE POLICY "Users can view conversations in their department"
ON public.conversations
FOR SELECT
TO authenticated
USING (
  is_admin()
  OR department_code = get_user_department(auth.uid())
  OR assigned_to = auth.uid()
);

-- UPDATE: Restritivo por departamento
CREATE POLICY "Users can update conversations in their department"
ON public.conversations
FOR UPDATE
TO authenticated
USING (
  is_admin()
  OR department_code = get_user_department(auth.uid())
  OR assigned_to = auth.uid()
);

-- DELETE: Apenas admins e managers do departamento
CREATE POLICY "Users can delete conversations in their department"
ON public.conversations
FOR DELETE
TO authenticated
USING (
  is_admin()
  OR (department_code = get_user_department(auth.uid()) AND is_manager())
);

-- =============================================
-- 4. CORRIGIR RLS DA TABELA PORTAL_LEADS_LOG
-- =============================================

DROP POLICY IF EXISTS "Admins can insert portal leads" ON public.portal_leads_log;
DROP POLICY IF EXISTS "Admins and system can insert portal leads" ON public.portal_leads_log;
DROP POLICY IF EXISTS "System can read portal leads" ON public.portal_leads_log;
DROP POLICY IF EXISTS "System can read portal leads for processing" ON public.portal_leads_log;

CREATE POLICY "Admins and system can insert portal leads"
ON public.portal_leads_log
FOR INSERT
WITH CHECK (
  is_admin()
  OR auth.role() = 'service_role'
);

CREATE POLICY "System can read portal leads for processing"
ON public.portal_leads_log
FOR SELECT
USING (
  is_admin()
  OR auth.role() = 'service_role'
);