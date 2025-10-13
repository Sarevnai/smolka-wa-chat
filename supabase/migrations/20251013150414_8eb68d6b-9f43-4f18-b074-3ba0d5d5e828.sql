-- ===================================================
-- MIGRAÇÃO: Sistema de Atribuição de Responsáveis
-- ===================================================

-- 1. Deletar tickets existentes e registros relacionados
DELETE FROM public.clickup_integration WHERE ticket_id IN (SELECT id::text FROM public.tickets);
DELETE FROM public.tickets;

-- 2. Dropar policies que usam assigned_to
DROP POLICY IF EXISTS "Users can view tickets based on role" ON public.tickets;

-- 3. Remover colunas obsoletas de tickets
ALTER TABLE public.tickets DROP COLUMN IF EXISTS type;

-- 4. Ajustar assigned_to para referenciar usuários reais
ALTER TABLE public.tickets ALTER COLUMN assigned_to DROP DEFAULT;
ALTER TABLE public.tickets ALTER COLUMN assigned_to TYPE uuid USING assigned_to::uuid;
ALTER TABLE public.tickets ADD CONSTRAINT fk_tickets_assigned_to 
  FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Recriar policy de visualização de tickets
CREATE POLICY "Users can view tickets based on role" 
  ON public.tickets FOR SELECT
  USING (
    is_admin() OR 
    is_manager() OR 
    (is_attendant() AND assigned_to = auth.uid())
  );

-- 6. Criar tabela de categorias genéricas (sem vinculação a tipo)
CREATE TABLE IF NOT EXISTS public.ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text NOT NULL,
  color text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ticket_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem visualizar categorias ativas
CREATE POLICY "Anyone can view active categories"
  ON public.ticket_categories FOR SELECT
  USING (is_active = true);

-- Policy: Gerentes e Admins podem criar categorias
CREATE POLICY "Managers and admins can create categories"
  ON public.ticket_categories FOR INSERT
  WITH CHECK (is_admin() OR is_manager());

-- Policy: Gerentes e Admins podem editar categorias
CREATE POLICY "Managers and admins can update categories"
  ON public.ticket_categories FOR UPDATE
  USING (is_admin() OR is_manager());

-- Policy: Apenas Admins podem deletar categorias
CREATE POLICY "Only admins can delete categories"
  ON public.ticket_categories FOR DELETE
  USING (is_admin());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ticket_categories_updated_at
  BEFORE UPDATE ON public.ticket_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 7. Inserir categorias genéricas padrão
INSERT INTO public.ticket_categories (name, icon, color) VALUES
  ('Manutenção', '🔧', 'bg-blue-100 text-blue-700'),
  ('Financeiro', '💰', 'bg-green-100 text-green-700'),
  ('Suporte', '📞', 'bg-yellow-100 text-yellow-700'),
  ('Documentação', '📋', 'bg-purple-100 text-purple-700'),
  ('Propriedade', '🏠', 'bg-orange-100 text-orange-700'),
  ('Contrato', '📄', 'bg-indigo-100 text-indigo-700')
ON CONFLICT (name) DO NOTHING;

-- 8. Remover dependência de tipo em ticket_stages
ALTER TABLE public.ticket_stages DROP COLUMN IF EXISTS ticket_type;

-- 9. Limpar stages existentes e criar stages genéricos
DELETE FROM public.ticket_stages;

INSERT INTO public.ticket_stages (name, color, order_index) VALUES
  ('Pendente', '#94a3b8', 1),
  ('Em Progresso', '#3b82f6', 2),
  ('Aguardando Resposta', '#f59e0b', 3),
  ('Concluído', '#10b981', 4);

-- 10. Simplificar clickup_config (usar apenas uma lista padrão)
ALTER TABLE public.clickup_config DROP COLUMN IF EXISTS proprietarios_list_id;
ALTER TABLE public.clickup_config DROP COLUMN IF EXISTS inquilinos_list_id;
ALTER TABLE public.clickup_config ADD COLUMN IF NOT EXISTS default_list_id text;