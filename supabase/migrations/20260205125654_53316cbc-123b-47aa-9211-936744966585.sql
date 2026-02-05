-- Padronização do naming: ai_arya → ai_vendas
-- Atualiza setting_category para usar o padrão Aimee de Vendas

UPDATE system_settings 
SET setting_category = 'ai_vendas'
WHERE setting_category = 'ai_arya';