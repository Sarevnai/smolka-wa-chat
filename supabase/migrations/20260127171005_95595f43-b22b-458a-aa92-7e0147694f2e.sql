-- Reset completo do lead 554888182882 (Ian Veras)
-- Ordem de exclusão respeita dependências de foreign keys

-- 1. Excluir mensagens (104 registros)
DELETE FROM messages 
WHERE wa_from = '554888182882' OR wa_to = '554888182882';

-- 2. Excluir estado da conversa
DELETE FROM conversation_states 
WHERE phone_number = '554888182882';

-- 3. Excluir conversa
DELETE FROM conversations 
WHERE phone_number = '554888182882';

-- 4. Excluir contato
DELETE FROM contacts 
WHERE phone = '554888182882';