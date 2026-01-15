
-- Adicionar configurações de departamento para portais
INSERT INTO system_settings (setting_category, setting_key, setting_value, description)
VALUES 
  ('portais', 'sell_department', '"vendas"', 'Departamento para leads de compra/venda'),
  ('portais', 'rent_department', '"locacao"', 'Departamento para leads de locação')
ON CONFLICT (setting_category, setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Corrigir departamento do contato Hallef
UPDATE contacts 
SET department_code = 'vendas'
WHERE phone = '5548988182882';
