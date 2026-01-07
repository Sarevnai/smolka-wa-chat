-- Reset AI state for conversations to allow Nina to respond again
UPDATE conversation_states
SET 
  is_ai_active = true,
  operator_id = NULL,
  operator_takeover_at = NULL,
  updated_at = now()
WHERE phone_number IN ('554888182882', '5548988182882');

-- Also reset the triage stage if it was stuck
UPDATE conversation_states
SET triage_stage = NULL
WHERE phone_number IN ('554888182882', '5548988182882')
AND triage_stage IS NOT NULL;