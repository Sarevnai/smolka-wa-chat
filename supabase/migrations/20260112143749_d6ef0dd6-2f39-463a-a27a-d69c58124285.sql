
-- Limpar completamente dados do contato Ian Veras para re-teste de triagem

-- 1. Deletar mensagens do telefone 5548988182882
DELETE FROM messages 
WHERE wa_from LIKE '%5548988182882%' OR wa_to LIKE '%5548988182882%';

-- 2. Deletar conversation_states (caso exista)
DELETE FROM conversation_states 
WHERE phone_number LIKE '%5548988182882%';

-- 3. Deletar conversas (caso exista)
DELETE FROM conversations 
WHERE phone_number LIKE '%5548988182882%';

-- 4. Deletar ai_suggestions (caso exista)
DELETE FROM ai_suggestions 
WHERE contact_phone LIKE '%5548988182882%';

-- 5. Deletar deleted_messages relacionadas
DELETE FROM deleted_messages 
WHERE original_message_data::text LIKE '%5548988182882%';

-- 6. Deletar pinned_conversations
DELETE FROM pinned_conversations 
WHERE phone_number LIKE '%5548988182882%';

-- 7. Deletar o contato
DELETE FROM contacts 
WHERE id = '8226e0de-fcb8-4127-ad26-1a7956f49523';
