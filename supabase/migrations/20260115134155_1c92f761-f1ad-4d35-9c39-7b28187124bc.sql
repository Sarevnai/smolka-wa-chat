-- =============================================
-- FASE 1: Isolar Mensagens por Departamento
-- =============================================

-- 1. Adicionar coluna department_code na tabela messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS department_code department_type;

-- 2. Criar índice para performance em queries filtradas por departamento
CREATE INDEX IF NOT EXISTS idx_messages_department_code ON messages(department_code);

-- 3. Criar índice composto para queries de conversa + departamento
CREATE INDEX IF NOT EXISTS idx_messages_conversation_department ON messages(conversation_id, department_code);

-- 4. Migrar mensagens existentes - atribuir department_code baseado na conversa
UPDATE messages m
SET department_code = c.department_code
FROM conversations c
WHERE m.conversation_id = c.id
AND m.department_code IS NULL
AND c.department_code IS NOT NULL;

-- =============================================
-- FASE 2: Configuração de IA por Departamento
-- =============================================

-- 1. Criar tabela para configurações de IA por departamento
CREATE TABLE IF NOT EXISTS ai_department_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_code department_type UNIQUE NOT NULL,
  agent_name TEXT NOT NULL DEFAULT 'Nina',
  tone TEXT NOT NULL DEFAULT 'friendly',
  greeting_message TEXT,
  custom_instructions TEXT,
  qualification_focus JSONB DEFAULT '[]'::jsonb,
  services JSONB DEFAULT '[]'::jsonb,
  limitations JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE ai_department_configs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de acesso
CREATE POLICY "Admins can manage ai_department_configs"
ON ai_department_configs FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view ai_department_configs"
ON ai_department_configs FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Trigger para updated_at
CREATE TRIGGER update_ai_department_configs_updated_at
  BEFORE UPDATE ON ai_department_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Inserir configurações iniciais para cada departamento
INSERT INTO ai_department_configs (department_code, agent_name, tone, greeting_message, custom_instructions, qualification_focus, services)
VALUES 
  (
    'locacao',
    'Nina Locação',
    'friendly',
    'Olá! Sou a Nina, especialista em locação de imóveis da Smolka. Como posso ajudar você hoje?',
    'Você é especialista em locação de imóveis. Foque em entender: tipo de imóvel desejado, bairro de preferência, valor mensal máximo, prazo de contrato, quantidade de quartos e vagas. Sempre mencione a facilidade do processo de locação e a segurança de alugar com a Smolka.',
    '["tipo_imovel", "bairro", "valor_aluguel", "quartos", "vagas", "prazo_contrato"]'::jsonb,
    '["Busca de imóveis para locação", "Agendamento de visitas", "Informações sobre documentação", "Simulação de custos de locação"]'::jsonb
  ),
  (
    'vendas',
    'Nina Vendas',
    'professional',
    'Olá! Sou a Nina, consultora de vendas da Smolka Imóveis. Estou aqui para ajudar você a encontrar o imóvel ideal!',
    'Você é especialista em venda de imóveis. Foque em entender: objetivo da compra (moradia ou investimento), tipo de imóvel, localização preferida, faixa de valor, forma de pagamento (à vista ou financiamento). Destaque a valorização dos imóveis e a expertise da Smolka no mercado.',
    '["objetivo_compra", "tipo_imovel", "bairro", "valor_compra", "forma_pagamento", "quartos"]'::jsonb,
    '["Busca de imóveis para compra", "Agendamento de visitas", "Simulação de financiamento", "Avaliação de imóveis", "Envio para CRM C2S"]'::jsonb
  ),
  (
    'administrativo',
    'Nina Administrativa',
    'helpful',
    'Olá! Sou a Nina do setor administrativo da Smolka. Como posso ajudar você hoje?',
    'Você é especialista em atendimento administrativo para clientes existentes. Foque em resolver questões sobre: boletos e pagamentos, contratos ativos, solicitações de manutenção, renovação de contratos, documentação. Seja sempre prestativa e encaminhe para o setor responsável quando necessário.',
    '["numero_contrato", "tipo_solicitacao", "urgencia"]'::jsonb,
    '["Segunda via de boletos", "Consulta de contratos", "Solicitação de manutenção", "Renovação de contrato", "Atualização cadastral"]'::jsonb
  ),
  (
    'marketing',
    'Nina Marketing',
    'enthusiastic',
    'Olá! Sou a Nina da equipe de Marketing da Smolka. Que bom falar com você!',
    'Você é especialista em captação de proprietários e campanhas de marketing. Foque em: confirmar interesse em anunciar imóvel, entender tipo e localização do imóvel, verificar disponibilidade para avaliação. Destaque os benefícios de anunciar com a Smolka e nossa presença digital.',
    '["tipo_imovel", "endereco", "objetivo_anuncio", "disponibilidade_visita"]'::jsonb,
    '["Avaliação de imóveis para anúncio", "Captação de proprietários", "Campanhas promocionais", "Parcerias"]'::jsonb
  )
ON CONFLICT (department_code) DO NOTHING;