
-- Delete all data for phone 554888182882

-- Delete messages first (FK constraint)
DELETE FROM messages WHERE conversation_id = 'b9c9b02a-b15a-436d-93e4-b13ce7f854e0';

-- Delete lead qualification
DELETE FROM lead_qualification WHERE phone_number = '554888182882';

-- Delete conversation states
DELETE FROM conversation_states WHERE phone_number = '554888182882';

-- Delete conversation
DELETE FROM conversations WHERE id = 'b9c9b02a-b15a-436d-93e4-b13ce7f854e0';

-- Delete contact
DELETE FROM contacts WHERE id = '043da517-ec1e-4672-b87c-254493204a6c';
