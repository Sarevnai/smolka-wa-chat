-- Purge test data for phone numbers used in recent tests
-- This allows clean retesting of the lead flow

DO $$
DECLARE
  test_phones text[] := ARRAY['554896316207', '554896048768'];
  phone_var text;
BEGIN
  FOREACH phone_var IN ARRAY test_phones
  LOOP
    -- Delete lead qualification records
    DELETE FROM lead_qualification WHERE phone_number = phone_var;
    
    -- Delete portal leads log
    DELETE FROM portal_leads_log WHERE contact_phone = phone_var;
    
    -- Delete c2s integration records
    DELETE FROM c2s_integration WHERE contact_id IN (
      SELECT id FROM contacts WHERE phone = phone_var
    );
    
    -- Delete messages
    DELETE FROM messages WHERE wa_from = phone_var OR wa_to = phone_var;
    
    -- Delete conversation states
    DELETE FROM conversation_states WHERE phone_number = phone_var;
    
    -- Delete conversations
    DELETE FROM conversations WHERE phone_number = phone_var;
    
    -- Delete contacts
    DELETE FROM contacts WHERE phone = phone_var;
    
    RAISE NOTICE 'Purged data for phone: %', phone_var;
  END LOOP;
END $$;