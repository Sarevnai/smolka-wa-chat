-- Garantir que a tabela messages tenha REPLICA IDENTITY FULL para realtime
-- Isso permite que o Supabase envie o objeto completo nas atualizações realtime
ALTER TABLE messages REPLICA IDENTITY FULL;

-- Adicionar índices para melhorar performance de queries realtime
CREATE INDEX IF NOT EXISTS idx_messages_wa_from ON messages(wa_from);
CREATE INDEX IF NOT EXISTS idx_messages_wa_to ON messages(wa_to);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
CREATE INDEX IF NOT EXISTS idx_messages_wa_timestamp ON messages(wa_timestamp DESC);