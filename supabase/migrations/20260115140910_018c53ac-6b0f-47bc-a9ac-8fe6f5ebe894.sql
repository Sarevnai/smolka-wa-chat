-- Adicionar constraint UNIQUE na coluna setting_key para permitir upsert
ALTER TABLE public.system_settings 
ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);