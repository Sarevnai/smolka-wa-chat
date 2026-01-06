
-- Deletar mensagens associadas à conversa
DELETE FROM messages 
WHERE conversation_id = 'ae0886e6-f78c-420f-bd7b-e5c2ab410f0c'
   OR wa_from = '554888182882'
   OR wa_to = '554888182882';

-- Deletar o estado da conversa
DELETE FROM conversation_states 
WHERE phone_number = '554888182882';

-- Deletar a conversa
DELETE FROM conversations 
WHERE id = 'ae0886e6-f78c-420f-bd7b-e5c2ab410f0c';
