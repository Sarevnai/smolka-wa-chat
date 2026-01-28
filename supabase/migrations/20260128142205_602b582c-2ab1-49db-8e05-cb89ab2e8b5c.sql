-- Delete all data for phone 554888182882 to reset for testing
-- This is a one-time cleanup operation

-- Delete messages
DELETE FROM messages WHERE wa_from = '554888182882' OR wa_to = '554888182882';

-- Delete conversation_states if any
DELETE FROM conversation_states WHERE phone_number = '554888182882';

-- Delete lead_qualification if any  
DELETE FROM lead_qualification WHERE phone_number = '554888182882';

-- Delete the conversation
DELETE FROM conversations WHERE phone_number = '554888182882';

-- Delete the contact
DELETE FROM contacts WHERE phone = '554888182882';