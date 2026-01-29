-- Reset Ian (554888182882)
-- Delete lead_qualification
DELETE FROM lead_qualification WHERE phone_number = '554888182882';

-- Delete conversation_states
DELETE FROM conversation_states WHERE phone_number = '554888182882';

-- Delete messages
DELETE FROM messages WHERE conversation_id = 'c86ebb26-a31d-440e-bbe0-81b3269d530b';

-- Delete conversation
DELETE FROM conversations WHERE id = 'c86ebb26-a31d-440e-bbe0-81b3269d530b';