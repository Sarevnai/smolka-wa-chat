-- Ajustar políticas RLS para permitir funcionalidade adequada - Correção da sintaxe
-- Manter segurança mas permitir que usuários autenticados acessem dados necessários

-- 1. Ajustar política de contatos para permitir usuários autenticados
DROP POLICY IF EXISTS "Users can view contacts (placeholder for future assignment syst" ON public.contacts;

CREATE POLICY "Authenticated users can view contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Permitir que usuários autenticados vejam campanhas (não só admins)
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;

CREATE POLICY "Authenticated users can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert campaigns" 
ON public.campaigns 
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update campaigns" 
ON public.campaigns 
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete campaigns" 
ON public.campaigns 
FOR DELETE
USING (is_admin());

-- 3. Permitir que usuários autenticados vejam resultados de campanhas
DROP POLICY IF EXISTS "Admins can manage campaign_results" ON public.campaign_results;

CREATE POLICY "Authenticated users can view campaign_results" 
ON public.campaign_results 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "System and admins can insert campaign_results" 
ON public.campaign_results 
FOR INSERT
WITH CHECK ((auth.role() = 'service_role'::text) OR is_admin());

CREATE POLICY "System and admins can update campaign_results" 
ON public.campaign_results 
FOR UPDATE
USING ((auth.role() = 'service_role'::text) OR is_admin());

CREATE POLICY "System and admins can delete campaign_results" 
ON public.campaign_results 
FOR DELETE
USING ((auth.role() = 'service_role'::text) OR is_admin());

-- 4. Permitir que usuários autenticados vejam templates de mensagem
DROP POLICY IF EXISTS "Admins can manage message_templates" ON public.message_templates;

CREATE POLICY "Authenticated users can view message_templates" 
ON public.message_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can insert message_templates" 
ON public.message_templates 
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update message_templates" 
ON public.message_templates 
FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete message_templates" 
ON public.message_templates 
FOR DELETE
USING (is_admin());