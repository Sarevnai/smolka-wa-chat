-- =============================================
-- FASE 1: Sistema de Tags para Contatos de Marketing
-- =============================================

-- Tabela de tags para contatos
CREATE TABLE public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  department_code department_type NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, department_code)
);

-- Tabela de relacionamento contato-tags (many-to-many)
CREATE TABLE public.contact_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(contact_id, tag_id)
);

-- Índices para performance
CREATE INDEX idx_contact_tags_department ON public.contact_tags(department_code);
CREATE INDEX idx_contact_tag_assignments_contact ON public.contact_tag_assignments(contact_id);
CREATE INDEX idx_contact_tag_assignments_tag ON public.contact_tag_assignments(tag_id);

-- Enable RLS
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para contact_tags
CREATE POLICY "Users can view tags in their department"
ON public.contact_tags FOR SELECT
USING (
  is_admin() OR 
  department_code = get_user_department(auth.uid()) OR
  has_function(auth.uid(), 'marketing'::app_function)
);

CREATE POLICY "Users can create tags in their department"
ON public.contact_tags FOR INSERT
WITH CHECK (
  is_admin() OR 
  department_code = get_user_department(auth.uid()) OR
  (has_function(auth.uid(), 'marketing'::app_function) AND department_code = 'marketing')
);

CREATE POLICY "Users can update tags in their department"
ON public.contact_tags FOR UPDATE
USING (
  is_admin() OR 
  department_code = get_user_department(auth.uid()) OR
  (has_function(auth.uid(), 'marketing'::app_function) AND department_code = 'marketing')
);

CREATE POLICY "Users can delete tags in their department"
ON public.contact_tags FOR DELETE
USING (
  is_admin() OR 
  department_code = get_user_department(auth.uid()) OR
  (has_function(auth.uid(), 'marketing'::app_function) AND department_code = 'marketing')
);

-- RLS Policies para contact_tag_assignments
CREATE POLICY "Users can view tag assignments"
ON public.contact_tag_assignments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create tag assignments"
ON public.contact_tag_assignments FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete tag assignments"
ON public.contact_tag_assignments FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para updated_at em contact_tags
CREATE TRIGGER update_contact_tags_updated_at
BEFORE UPDATE ON public.contact_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();