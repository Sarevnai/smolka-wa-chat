
-- Excluir mensagens do lead 554888182882
DELETE FROM messages WHERE wa_from = '554888182882' OR wa_to = '554888182882';

-- Excluir lead_qualification
DELETE FROM lead_qualification WHERE phone_number = '554888182882';

-- Excluir conversation_states
DELETE FROM conversation_states WHERE phone_number = '554888182882';

-- Excluir conversations
DELETE FROM conversations WHERE phone_number = '554888182882';

-- Excluir contact
DELETE FROM contacts WHERE phone = '554888182882';
