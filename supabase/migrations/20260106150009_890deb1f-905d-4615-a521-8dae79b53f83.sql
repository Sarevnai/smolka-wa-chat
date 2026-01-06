-- Permite que usuários autenticados excluam conversas do seu departamento ou sem departamento
CREATE POLICY "Users can delete conversations in their department"
ON public.conversations FOR DELETE
USING (
  is_admin()
  OR department_code = get_user_department(auth.uid())
  OR department_code IS NULL
);