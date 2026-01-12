
-- Limpar completamente dados do telefone 554888182882

-- 1. Deletar mensagens
DELETE FROM messages 
WHERE wa_from LIKE '%554888182882%' OR wa_to LIKE '%554888182882%';

-- 2. Deletar conversation_states
DELETE FROM conversation_states 
WHERE phone_number LIKE '%554888182882%';

-- 3. Deletar conversas
DELETE FROM conversations 
WHERE phone_number LIKE '%554888182882%';

-- 4. Deletar ai_suggestions
DELETE FROM ai_suggestions 
WHERE contact_phone LIKE '%554888182882%';

-- 5. Deletar deleted_messages relacionadas
DELETE FROM deleted_messages 
WHERE original_message_data::text LIKE '%554888182882%';

-- 6. Deletar pinned_conversations
DELETE FROM pinned_conversations 
WHERE phone_number LIKE '%554888182882%';

-- 7. Deletar o contato
DELETE FROM contacts 
WHERE phone LIKE '%554888182882%';
