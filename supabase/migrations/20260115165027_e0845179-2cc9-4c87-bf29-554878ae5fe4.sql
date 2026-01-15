-- Inserir stages do pipeline para o setor administrativo
INSERT INTO conversation_stages (name, color, order_index, department_code, is_final) VALUES
  ('Pendente', '#f59e0b', 1, 'administrativo', false),
  ('Em Análise', '#3b82f6', 2, 'administrativo', false),
  ('Aguardando Setor', '#8b5cf6', 3, 'administrativo', false),
  ('Em Andamento', '#10b981', 4, 'administrativo', false),
  ('Concluído', '#22c55e', 5, 'administrativo', true)
ON CONFLICT DO NOTHING;