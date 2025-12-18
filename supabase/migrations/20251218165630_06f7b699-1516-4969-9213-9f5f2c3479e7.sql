-- Limpar dados para testar novo fluxo de negociação

-- 1. Limpar mensagens
DELETE FROM messages;

-- 2. Limpar estados de conversas (pending_properties, negotiation, triage_stage)
DELETE FROM conversation_states;

-- 3. Limpar conversas
DELETE FROM conversations;

-- 4. Resetar nomes dos contatos
UPDATE contacts SET name = NULL WHERE name IS NOT NULL;