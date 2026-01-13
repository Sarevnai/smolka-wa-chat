-- Create ai_behavior_config table for AI behavior settings
CREATE TABLE IF NOT EXISTS public.ai_behavior_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  essential_questions JSONB DEFAULT '[]'::jsonb,
  functions JSONB DEFAULT '[]'::jsonb,
  reengagement_hours INTEGER DEFAULT 6,
  send_cold_leads BOOLEAN DEFAULT false,
  require_cpf_for_visit BOOLEAN DEFAULT false,
  visit_schedule JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.ai_behavior_config ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view config
CREATE POLICY "Authenticated users can view ai_behavior_config"
ON public.ai_behavior_config
FOR SELECT
TO authenticated
USING (true);

-- Create policy for admins to manage config
CREATE POLICY "Admins can manage ai_behavior_config"
ON public.ai_behavior_config
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Add new columns to portal_leads_log for analytics
ALTER TABLE public.portal_leads_log 
ADD COLUMN IF NOT EXISTS ai_attended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_attended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS crm_status TEXT DEFAULT 'not_ready',
ADD COLUMN IF NOT EXISTS crm_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lead_temperature TEXT,
ADD COLUMN IF NOT EXISTS hour_of_day INTEGER,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_ai_behavior_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_behavior_config_updated_at
BEFORE UPDATE ON public.ai_behavior_config
FOR EACH ROW
EXECUTE FUNCTION public.update_ai_behavior_config_updated_at();

-- Insert default config if not exists
INSERT INTO public.ai_behavior_config (
  essential_questions,
  functions,
  reengagement_hours,
  send_cold_leads,
  require_cpf_for_visit,
  visit_schedule
) 
SELECT 
  '[
    {"id": "objective", "question": "Objetivo: comprar ou alugar", "category": "operation", "isQualifying": true, "isLocked": true, "order": 1, "enabled": true},
    {"id": "name", "question": "Nome do lead", "category": "lead_info", "isQualifying": false, "isLocked": false, "order": 2, "enabled": true},
    {"id": "neighborhood", "question": "Bairro desejado", "category": "location", "isQualifying": false, "isLocked": false, "order": 3, "enabled": true},
    {"id": "city", "question": "Cidade", "category": "location", "isQualifying": false, "isLocked": false, "order": 4, "enabled": true},
    {"id": "property_features", "question": "Características do imóvel", "category": "property", "isQualifying": false, "isLocked": false, "order": 5, "enabled": true},
    {"id": "price_range", "question": "Faixa de preço desejada", "category": "property", "isQualifying": false, "isLocked": false, "order": 6, "enabled": true},
    {"id": "property_type", "question": "Tipo do imóvel", "category": "property", "isQualifying": false, "isLocked": false, "order": 7, "enabled": true}
  ]'::jsonb,
  '[
    {"id": "iptu_access", "name": "Acesso ao IPTU", "description": "A IA irá acessar o IPTU presente na prateleira de imóveis", "enabled": false, "config": {}},
    {"id": "visit_scheduling", "name": "Agendamento de Visita", "description": "A IA agenda visitas diretamente com os leads qualificados", "enabled": true, "config": {"requireCpf": true, "minDays": 1, "maxDays": 3}},
    {"id": "reengagement", "name": "Reengajamento", "description": "A IA tentará reengajar leads inativos após um período", "enabled": true, "config": {"hours": 6}},
    {"id": "full_address", "name": "Envio de endereço completo", "description": "A IA irá enviar o endereço completo do imóvel ao lead", "enabled": false, "config": {}},
    {"id": "cold_leads_crm", "name": "Envio de leads frios ao CRM", "description": "A IA irá enviar os leads frios ao CRM automaticamente", "enabled": false, "config": {}},
    {"id": "invalid_whatsapp", "name": "Leads com WhatsApp inválido", "description": "Leads que não conseguir contatar serão enviados ao CRM", "enabled": false, "config": {}}
  ]'::jsonb,
  6,
  false,
  true,
  '{"weekdays": {"start": "09:00", "end": "17:00"}, "saturday": {"start": "09:00", "end": "12:00"}, "sunday": null}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.ai_behavior_config LIMIT 1);