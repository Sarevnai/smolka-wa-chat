-- Reset Eduardo (554896426215)
-- Delete lead_qualification
DELETE FROM lead_qualification WHERE phone_number = '554896426215';

-- Delete conversation_states
DELETE FROM conversation_states WHERE phone_number = '554896426215';

-- Delete messages
DELETE FROM messages WHERE conversation_id = '5fcad63a-3b81-4fd2-a5aa-a8680d7e396e';

-- Delete conversation
DELETE FROM conversations WHERE id = '5fcad63a-3b81-4fd2-a5aa-a8680d7e396e';