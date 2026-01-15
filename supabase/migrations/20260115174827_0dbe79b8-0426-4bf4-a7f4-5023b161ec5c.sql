-- Delete messages first (foreign key to conversations)
DELETE FROM messages 
WHERE conversation_id = '09444a78-52bd-44fc-9cce-52fb746cbeed';

-- Delete conversation (foreign key to contacts)
DELETE FROM conversations 
WHERE id = '09444a78-52bd-44fc-9cce-52fb746cbeed';

-- Delete contact
DELETE FROM contacts 
WHERE id = '8f5b566a-5991-4152-9b56-46429695675f';