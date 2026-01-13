-- ====================================================
-- Tabela para rastrear qualificação de leads de portais
-- ====================================================

CREATE TABLE public.lead_qualification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  portal_lead_id UUID REFERENCES public.portal_leads_log(id) ON DELETE SET NULL,
  
  -- Respostas às perguntas essenciais (JSON com id da pergunta e resposta)
  answers JSONB DEFAULT '{}',
  
  -- Status de qualificação
  qualification_score INTEGER DEFAULT 0 CHECK (qualification_score >= 0 AND qualification_score <= 100),
  qualification_status TEXT DEFAULT 'pending' CHECK (qualification_status IN ('pending', 'qualifying', 'qualified', 'disqualified', 'cold', 'sent_to_crm')),
  disqualification_reason TEXT, -- 'corretor', 'curioso', 'sem_interesse', 'sem_resposta', 'fora_perfil'
  
  -- Contadores
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  ai_messages INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  sent_to_crm_at TIMESTAMPTZ,
  
  -- Dados do lead
  detected_interest TEXT, -- 'compra', 'locacao'
  detected_property_type TEXT, -- 'apartamento', 'casa', etc
  detected_neighborhood TEXT,
  detected_budget_min NUMERIC,
  detected_budget_max NUMERIC,
  detected_bedrooms INTEGER,
  
  -- Flags
  is_broker BOOLEAN DEFAULT false,
  is_curious BOOLEAN DEFAULT false,
  needs_reengagement BOOLEAN DEFAULT false,
  reengagement_attempts INTEGER DEFAULT 0,
  last_reengagement_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(phone_number, conversation_id)
);

-- Índices para performance
CREATE INDEX idx_lead_qualification_phone ON public.lead_qualification(phone_number);
CREATE INDEX idx_lead_qualification_status ON public.lead_qualification(qualification_status);
CREATE INDEX idx_lead_qualification_portal ON public.lead_qualification(portal_lead_id);
CREATE INDEX idx_lead_qualification_needs_reengagement ON public.lead_qualification(needs_reengagement) WHERE needs_reengagement = true;
CREATE INDEX idx_lead_qualification_created ON public.lead_qualification(created_at DESC);

-- RLS
ALTER TABLE public.lead_qualification ENABLE ROW LEVEL SECURITY;

-- Políticas: admins e managers podem ver tudo
CREATE POLICY "Admins can manage lead qualifications"
ON public.lead_qualification
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_functions
    WHERE user_id = auth.uid()
    AND function IN ('admin', 'manager')
  )
);

-- Atendentes podem ver qualificações
CREATE POLICY "Attendants can view lead qualifications"
ON public.lead_qualification
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_functions
    WHERE user_id = auth.uid()
  )
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_lead_qualification_updated_at
BEFORE UPDATE ON public.lead_qualification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================
-- Adicionar colunas à portal_leads_log se não existirem
-- ====================================================

-- Coluna para rastrear reengajamento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'portal_leads_log' 
    AND column_name = 'reengagement_count'
  ) THEN
    ALTER TABLE public.portal_leads_log ADD COLUMN reengagement_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'portal_leads_log' 
    AND column_name = 'last_reengagement_at'
  ) THEN
    ALTER TABLE public.portal_leads_log ADD COLUMN last_reengagement_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'portal_leads_log' 
    AND column_name = 'qualification_id'
  ) THEN
    ALTER TABLE public.portal_leads_log ADD COLUMN qualification_id UUID REFERENCES public.lead_qualification(id);
  END IF;
END $$;