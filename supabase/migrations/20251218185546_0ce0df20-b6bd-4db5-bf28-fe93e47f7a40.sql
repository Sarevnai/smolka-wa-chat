-- =====================================================
-- FASE 1: Atualizar todos os contatos existentes para administrativo
-- =====================================================
UPDATE public.contacts 
SET department_code = 'administrativo' 
WHERE department_code IS NULL;

-- =====================================================
-- FASE 2: Remover políticas RLS antigas e criar novas com separação estrita
-- =====================================================

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view contacts in their department or unassigned" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their department" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their department" ON public.contacts;
DROP POLICY IF EXISTS "Admins and managers can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Only admins can delete contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow system to insert contacts" ON public.contacts;

-- POLÍTICA SELECT: Separação estrita por departamento (sem NULL)
CREATE POLICY "Users can view contacts in their department"
ON public.contacts 
FOR SELECT
USING (
  is_admin() 
  OR department_code = get_user_department(auth.uid())
);

-- POLÍTICA INSERT: Exigir departamento para não-admins
CREATE POLICY "Users can create contacts in their department"
ON public.contacts 
FOR INSERT
WITH CHECK (
  is_admin()
  OR (
    department_code IS NOT NULL 
    AND department_code = get_user_department(auth.uid())
  )
  OR auth.role() = 'service_role'
);

-- POLÍTICA UPDATE: Admins e managers podem atualizar contatos do seu departamento
CREATE POLICY "Admins and managers can update contacts"
ON public.contacts 
FOR UPDATE
USING (
  is_admin() 
  OR (is_manager() AND department_code = get_user_department(auth.uid()))
);

-- POLÍTICA DELETE: Apenas admins podem excluir
CREATE POLICY "Only admins can delete contacts"
ON public.contacts 
FOR DELETE
USING (is_admin());