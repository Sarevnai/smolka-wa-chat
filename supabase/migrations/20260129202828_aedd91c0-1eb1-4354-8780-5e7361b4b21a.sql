-- Add columns for consultative 1-on-1 property presentation flow
ALTER TABLE conversation_states 
ADD COLUMN IF NOT EXISTS current_property_index integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS awaiting_property_feedback boolean DEFAULT false;

-- Add index for faster lookup
CREATE INDEX IF NOT EXISTS idx_conversation_states_feedback 
ON conversation_states(phone_number) 
WHERE awaiting_property_feedback = true;