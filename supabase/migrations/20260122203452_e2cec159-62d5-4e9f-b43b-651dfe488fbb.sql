-- Limpar todas as tabelas relacionadas ao número de teste 554888182882
DELETE FROM lead_qualification WHERE phone_number = '554888182882';
DELETE FROM portal_leads_log WHERE contact_phone = '554888182882';
DELETE FROM c2s_integration WHERE contact_id IN (
  SELECT id FROM contacts WHERE phone = '554888182882'
);
DELETE FROM messages WHERE wa_from = '554888182882' OR wa_to = '554888182882';
DELETE FROM conversation_states WHERE phone_number = '554888182882';
DELETE FROM conversations WHERE phone_number = '554888182882';
DELETE FROM contacts WHERE phone = '554888182882';