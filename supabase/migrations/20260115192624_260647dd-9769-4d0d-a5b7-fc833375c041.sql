-- 3. Criar conversa para o lead no departamento vendas (se não existir)
INSERT INTO conversations (phone_number, contact_id, department_code, status)
SELECT '5548988182882', id, 'vendas', 'active'
FROM contacts 
WHERE phone = '5548988182882'
AND NOT EXISTS (
  SELECT 1 FROM conversations WHERE phone_number = '5548988182882'
);