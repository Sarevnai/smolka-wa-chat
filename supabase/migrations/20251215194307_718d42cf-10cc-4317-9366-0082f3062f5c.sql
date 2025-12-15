-- Add AI handling fields to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS ai_handling boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_takeover_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS operator_takeover_by uuid,
ADD COLUMN IF NOT EXISTS operator_takeover_at timestamp with time zone;

-- Create conversation_state table for more detailed tracking
CREATE TABLE IF NOT EXISTS public.conversation_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  is_ai_active boolean DEFAULT false,
  ai_started_at timestamp with time zone,
  operator_id uuid,
  operator_takeover_at timestamp with time zone,
  last_ai_message_at timestamp with time zone,
  last_human_message_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view conversation states"
ON public.conversation_states FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert conversation states"
ON public.conversation_states FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update conversation states"
ON public.conversation_states FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add business hours to system_settings
INSERT INTO public.system_settings (setting_category, setting_key, setting_value, description)
VALUES (
  'business',
  'business_hours',
  '{"start": "08:00", "end": "18:00", "days": [1, 2, 3, 4, 5], "timezone": "America/Sao_Paulo"}'::jsonb,
  'Horário comercial para atendimento humano. Dias: 0=Dom, 1=Seg, ..., 6=Sáb'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Add N8N webhook URL setting
INSERT INTO public.system_settings (setting_category, setting_key, setting_value, description)
VALUES (
  'integrations',
  'n8n_webhook_url',
  '""'::jsonb,
  'URL do webhook N8N para atendimento virtual'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_conversation_states_updated_at
BEFORE UPDATE ON public.conversation_states
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();