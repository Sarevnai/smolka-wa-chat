-- Update ClickUp default_list_id to the correct value
UPDATE clickup_config 
SET 
  default_list_id = '901412657352',
  updated_at = now()
WHERE default_list_id = '901412826022';