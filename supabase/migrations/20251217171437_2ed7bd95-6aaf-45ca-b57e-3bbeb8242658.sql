-- Phase 1: Multi-sector conversation architecture

-- 1. Create departments enum
CREATE TYPE public.department_type AS ENUM ('locacao', 'administrativo', 'vendas');

-- 2. Create departments table for configuration
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code department_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  pipeline_type TEXT NOT NULL DEFAULT 'kanban', -- 'kanban' for locacao/vendas, 'tickets' for administrativo
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Insert default departments
INSERT INTO public.departments (code, name, description, pipeline_type) VALUES
  ('locacao', 'Locação', 'Atendimento e qualificação de leads para locação de imóveis', 'kanban'),
  ('administrativo', 'Administrativo', 'Atendimento a inquilinos e proprietários com contratos ativos', 'tickets'),
  ('vendas', 'Vendas', 'Atendimento e qualificação de leads para venda de imóveis', 'kanban');

-- 4. Create conversation stages table (per department)
CREATE TABLE public.conversation_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code department_type NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  order_index INTEGER NOT NULL,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_code, order_index)
);

-- 5. Insert default stages for each department
-- Locação (CRM Kanban)
INSERT INTO public.conversation_stages (department_code, name, color, order_index, is_final) VALUES
  ('locacao', 'Novo Lead', '#3B82F6', 1, false),
  ('locacao', 'Qualificação', '#F59E0B', 2, false),
  ('locacao', 'Apresentação', '#8B5CF6', 3, false),
  ('locacao', 'Agendamento', '#10B981', 4, false),
  ('locacao', 'Visita Realizada', '#06B6D4', 5, false),
  ('locacao', 'Proposta', '#EC4899', 6, false),
  ('locacao', 'Fechado', '#22C55E', 7, true),
  ('locacao', 'Perdido', '#EF4444', 8, true);

-- Vendas (CRM Kanban - similar to locação)
INSERT INTO public.conversation_stages (department_code, name, color, order_index, is_final) VALUES
  ('vendas', 'Novo Lead', '#3B82F6', 1, false),
  ('vendas', 'Qualificação', '#F59E0B', 2, false),
  ('vendas', 'Apresentação', '#8B5CF6', 3, false),
  ('vendas', 'Agendamento', '#10B981', 4, false),
  ('vendas', 'Visita Realizada', '#06B6D4', 5, false),
  ('vendas', 'Proposta', '#EC4899', 6, false),
  ('vendas', 'Fechado', '#22C55E', 7, true),
  ('vendas', 'Perdido', '#EF4444', 8, true);

-- Administrativo uses existing ticket_stages, no need for conversation stages

-- 6. Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  department_code department_type, -- NULL = pending triage by Helena
  stage_id UUID REFERENCES public.conversation_stages(id) ON DELETE SET NULL,
  
  -- Qualification data (filled by AI agent)
  qualification_score INTEGER CHECK (qualification_score >= 0 AND qualification_score <= 100),
  qualification_data JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  
  -- Assignment
  assigned_to UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_reason TEXT,
  
  -- Timestamps
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure unique active conversation per phone+department
  UNIQUE(phone_number, department_code, status)
);

-- 7. Add conversation_id to messages (NULLABLE for backward compatibility)
ALTER TABLE public.messages 
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL;

-- 8. Create indexes for performance
CREATE INDEX idx_conversations_phone ON public.conversations(phone_number);
CREATE INDEX idx_conversations_department ON public.conversations(department_code);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_stage ON public.conversations(stage_id);
CREATE INDEX idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

-- 9. Add department to user_functions for access control
ALTER TABLE public.user_functions 
ADD COLUMN department_code department_type;

-- 10. Enable RLS on new tables
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies for departments (read-only for all authenticated)
CREATE POLICY "Authenticated users can view departments"
ON public.departments FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 12. RLS Policies for conversation_stages
CREATE POLICY "Authenticated users can view conversation stages"
ON public.conversation_stages FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage conversation stages"
ON public.conversation_stages FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 13. Helper function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS department_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_code 
  FROM public.user_functions 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- 14. Helper function to check if user can access conversation
CREATE OR REPLACE FUNCTION public.can_access_conversation(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
    AND (
      -- Admins can access all
      has_function(_user_id, 'admin'::app_function)
      -- Or user's department matches conversation department
      OR c.department_code = get_user_department(_user_id)
      -- Or conversation is unassigned (pending triage)
      OR c.department_code IS NULL
    )
  )
$$;

-- 15. RLS Policies for conversations
CREATE POLICY "Users can view conversations in their department"
ON public.conversations FOR SELECT
USING (
  is_admin() 
  OR department_code = get_user_department(auth.uid())
  OR department_code IS NULL
);

CREATE POLICY "System can insert conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update conversations in their department"
ON public.conversations FOR UPDATE
USING (
  is_admin()
  OR department_code = get_user_department(auth.uid())
  OR department_code IS NULL
);

-- 16. Trigger for updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversation_stages_updated_at
BEFORE UPDATE ON public.conversation_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();