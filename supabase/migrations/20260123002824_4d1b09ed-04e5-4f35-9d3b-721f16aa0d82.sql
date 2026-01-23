
-- Limpar todos os registros de teste para re-testar o fluxo completo

-- 1. Limpar logs de leads do portal
DELETE FROM portal_leads_log;

-- 2. Limpar qualificações de leads
DELETE FROM lead_qualification;

-- 3. Limpar estados de conversação
DELETE FROM conversation_states;

-- 4. Limpar mensagens deletadas
DELETE FROM deleted_messages;

-- 5. Limpar mensagens
DELETE FROM messages;

-- 6. Limpar conversas
DELETE FROM conversations;

-- 7. Limpar contatos de teste (apenas os números 5548...)
DELETE FROM contacts WHERE phone LIKE '5548%';
