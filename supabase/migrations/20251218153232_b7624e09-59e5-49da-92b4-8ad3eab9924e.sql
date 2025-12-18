-- Add triage_stage column to conversation_states for tracking triage flow
-- Values: 'greeting', 'awaiting_name', 'awaiting_triage', 'completed'

ALTER TABLE public.conversation_states 
ADD COLUMN IF NOT EXISTS triage_stage TEXT DEFAULT NULL;

-- Add index for efficient filtering by triage_stage
CREATE INDEX IF NOT EXISTS idx_conversation_states_triage_stage 
ON public.conversation_states(triage_stage) 
WHERE triage_stage IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.conversation_states.triage_stage IS 
'Tracks the triage flow stage: greeting, awaiting_name, awaiting_triage, completed';