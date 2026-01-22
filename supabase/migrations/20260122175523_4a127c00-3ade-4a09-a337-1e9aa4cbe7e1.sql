-- Add quick transfer mode setting for Arya
INSERT INTO public.system_settings (setting_key, setting_value, setting_category, description)
VALUES (
  'quick_transfer_mode',
  'true',
  'ai_arya',
  'Quando ativo, a Arya apenas confirma interesse e encaminha para C2S sem responder perguntas técnicas'
)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'true';