-- Purge all data for phone number 554888182882

-- 1. Delete portal lead logs
DELETE FROM portal_leads_log 
WHERE contact_phone = '554888182882';

-- 2. Delete conversation states
DELETE FROM conversation_states 
WHERE phone_number = '554888182882';

-- 3. Delete lead qualification records
DELETE FROM lead_qualification 
WHERE phone_number = '554888182882';

-- 4. Delete messages
DELETE FROM messages 
WHERE wa_from = '554888182882' OR wa_to = '554888182882';

-- 5. Delete conversations
DELETE FROM conversations 
WHERE phone_number = '554888182882';

-- 6. Delete the contact
DELETE FROM contacts 
WHERE phone = '554888182882';