-- Inserir o departamento na tabela departments
INSERT INTO public.departments (code, name, description, is_active, pipeline_type)
VALUES ('marketing', 'Marketing', 'Setor de Marketing e Campanhas', true, 'funnel')
ON CONFLICT (code) DO NOTHING;

-- Criar estágios de pipeline para o Marketing
INSERT INTO public.conversation_stages (department_code, name, color, order_index, is_final)
VALUES 
  ('marketing', 'Novo Lead', '#ec4899', 0, false),
  ('marketing', 'Prospect', '#a855f7', 1, false),
  ('marketing', 'Engajado', '#f43f5e', 2, false),
  ('marketing', 'Em Campanha', '#d946ef', 3, false),
  ('marketing', 'Convertido', '#22c55e', 4, true)
ON CONFLICT DO NOTHING;