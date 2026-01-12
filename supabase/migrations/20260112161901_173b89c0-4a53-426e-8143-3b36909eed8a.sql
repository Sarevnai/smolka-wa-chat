-- Adicionar política para permitir admins atualizarem qualquer perfil
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO public
  USING (is_admin())
  WITH CHECK (is_admin());