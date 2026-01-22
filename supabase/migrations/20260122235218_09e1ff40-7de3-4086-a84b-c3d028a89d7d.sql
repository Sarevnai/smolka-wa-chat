-- Atualizar ai_department_configs - Renomear Arya/Nina para Helena
UPDATE ai_department_configs 
SET 
  agent_name = REPLACE(REPLACE(agent_name, 'Arya', 'Helena'), 'Nina', 'Helena'),
  greeting_message = REPLACE(REPLACE(greeting_message, 'Nina', 'Helena'), 'Arya', 'Helena'),
  updated_at = now()
WHERE agent_name ILIKE '%Arya%' OR agent_name ILIKE '%Nina%' 
   OR greeting_message ILIKE '%Arya%' OR greeting_message ILIKE '%Nina%';

-- Atualizar system_settings (ai_agent_config) - Substituir referências a Arya/Nina
UPDATE system_settings 
SET 
  setting_value = jsonb_set(
    jsonb_set(
      setting_value,
      '{agent_name}',
      '"Helena Smolka"'
    ),
    '{greeting_message}',
    '"Olá! Sou a Helena, assistente virtual da Smolka Imóveis. Como posso ajudar?"'
  ),
  updated_at = now()
WHERE setting_key = 'ai_agent_config'
  AND (
    setting_value->>'agent_name' ILIKE '%Arya%' 
    OR setting_value->>'agent_name' ILIKE '%Nina%'
    OR setting_value->>'agent_name' IS NULL
  );

-- Atualizar marketing_ai_config - Substituir referências a Arya/Nina
UPDATE system_settings 
SET 
  setting_value = jsonb_set(
    jsonb_set(
      setting_value,
      '{agent_name}',
      '"Helena Marketing"'
    ),
    '{greeting_message}',
    '"Olá! 👋 Sou a Helena, assistente de marketing da Smolka. Como posso ajudá-lo hoje?"'
  ),
  updated_at = now()
WHERE setting_key = 'marketing_ai_config'
  AND (
    setting_value->>'agent_name' ILIKE '%Arya%' 
    OR setting_value->>'agent_name' ILIKE '%Nina%'
    OR setting_value->>'greeting_message' ILIKE '%Arya%'
    OR setting_value->>'greeting_message' ILIKE '%Nina%'
  );

-- Atualizar developments (Villa Maggiore) - Adicionar bairro João Paulo e instruções Helena
UPDATE developments 
SET 
  neighborhood = 'João Paulo',
  ai_instructions = 'Helena Smolka - Qualificação leve de leads da Landing Page. Descobrir nome, objetivo (morar/investir), prioridade (localização, lazer, bem-estar, tamanho). Transferir para especialista com resumo.',
  updated_at = now()
WHERE slug = 'villa-maggiore' OR name ILIKE '%Villa Maggiore%';