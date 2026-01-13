-- Remover constraint existente que é apenas em setting_key
ALTER TABLE public.system_settings 
DROP CONSTRAINT IF EXISTS system_settings_setting_key_key;

-- Criar nova constraint composta para permitir upsert correto
ALTER TABLE public.system_settings 
ADD CONSTRAINT system_settings_category_key_unique 
UNIQUE (setting_category, setting_key);