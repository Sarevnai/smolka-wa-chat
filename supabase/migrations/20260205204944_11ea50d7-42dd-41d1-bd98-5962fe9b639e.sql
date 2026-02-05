
-- Deletar registros do lead 554888182882 (Ian)

-- 1. Deletar mensagens primeiro (sem FK constraint)
DELETE FROM messages WHERE wa_from = '554888182882' OR wa_to = '554888182882';

-- 2. Deletar portal_leads_log
DELETE FROM portal_leads_log WHERE contact_phone = '554888182882';

-- 3. Deletar conversation_states
DELETE FROM conversation_states WHERE phone_number = '554888182882';

-- 4. Deletar conversations
DELETE FROM conversations WHERE phone_number = '554888182882';

-- 5. Deletar contact por último (pode ter FKs apontando para ele)
DELETE FROM contacts WHERE phone = '554888182882';
