-- Add onboarding status column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN onboarding_status text DEFAULT 'pending' CHECK (onboarding_status IN ('pending', 'waiting_name', 'waiting_type', 'completed'));

-- Create index for better performance
CREATE INDEX idx_contacts_onboarding_status ON public.contacts(onboarding_status);

-- Create table for storing approved WhatsApp templates
CREATE TABLE public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name text NOT NULL UNIQUE,
  template_id text NOT NULL,
  language text NOT NULL DEFAULT 'pt_BR',
  category text NOT NULL,
  components jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on whatsapp_templates
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for whatsapp_templates
CREATE POLICY "Allow authenticated users full access to whatsapp_templates" 
ON public.whatsapp_templates 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample templates (replace with your actual approved templates)
INSERT INTO public.whatsapp_templates (template_name, template_id, category, components) VALUES
('welcome_message', 'welcome_template_id', 'UTILITY', '[
  {
    "type": "BODY",
    "text": "Olá! Seja bem-vindo(a)! Para melhor atendê-lo(a), qual é o seu nome?"
  }
]'::jsonb),
('classification_message', 'classification_template_id', 'UTILITY', '[
  {
    "type": "BODY", 
    "text": "Obrigado {{1}}! Como posso ajudá-lo(a) hoje?"
  },
  {
    "type": "BUTTONS",
    "buttons": [
      {
        "type": "QUICK_REPLY",
        "text": "Sou Proprietário"
      },
      {
        "type": "QUICK_REPLY", 
        "text": "Sou Inquilino"
      }
    ]
  }
]'::jsonb);