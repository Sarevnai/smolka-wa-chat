-- Limpar dados para refazer teste de triagem

-- 1. Limpar mensagens
DELETE FROM messages;

-- 2. Limpar estados de conversas (triage_stage, is_ai_active, etc)
DELETE FROM conversation_states;

-- 3. Limpar conversas
DELETE FROM conversations;

-- 4. Resetar nomes dos contatos para testar fluxo de captura de nome
UPDATE contacts SET name = NULL WHERE name IS NOT NULL;