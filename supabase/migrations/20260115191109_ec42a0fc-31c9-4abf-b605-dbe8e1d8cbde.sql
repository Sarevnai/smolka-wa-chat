-- Atualizar ai_department_configs
UPDATE public.ai_department_configs 
SET agent_name = 'Arya' 
WHERE agent_name IN ('Nina', 'Helena');

-- Atualizar system_settings (ai_agent_config)
UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{agent_name}', '"Arya"')
WHERE setting_key = 'ai_agent_config' 
AND setting_value->>'agent_name' IN ('Nina', 'Helena');

-- Atualizar system_settings (marketing_ai_config)
UPDATE public.system_settings 
SET setting_value = jsonb_set(setting_value, '{agent_name}', '"Arya Marketing"')
WHERE setting_key = 'marketing_ai_config' 
AND setting_value->>'agent_name' LIKE '%Nina%';