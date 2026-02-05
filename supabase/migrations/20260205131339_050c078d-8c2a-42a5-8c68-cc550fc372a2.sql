-- FASE 2: Atualizar descrição do quick_transfer_mode para usar Aimee
UPDATE system_settings 
SET description = 'Quando ativo, a Aimee de Vendas apenas confirma interesse e encaminha para C2S sem responder perguntas técnicas'
WHERE setting_key = 'quick_transfer_mode'
  AND description ILIKE '%Arya%';