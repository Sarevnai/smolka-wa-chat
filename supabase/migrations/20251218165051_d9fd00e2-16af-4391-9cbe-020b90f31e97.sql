-- Adicionar campos para lógica de negociação no conversation_states
ALTER TABLE conversation_states 
ADD COLUMN IF NOT EXISTS last_search_params JSONB,
ADD COLUMN IF NOT EXISTS negotiation_pending BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suggested_price_max NUMERIC;

-- Comentários para documentação
COMMENT ON COLUMN conversation_states.last_search_params IS 'Parâmetros da última busca de imóveis para reutilização na negociação';
COMMENT ON COLUMN conversation_states.negotiation_pending IS 'Indica se está aguardando resposta do cliente sobre aumentar o orçamento';
COMMENT ON COLUMN conversation_states.suggested_price_max IS 'Novo valor máximo sugerido na negociação (atual + 1000)';