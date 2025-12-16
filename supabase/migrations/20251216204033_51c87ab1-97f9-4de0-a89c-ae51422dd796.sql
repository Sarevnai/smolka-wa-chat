-- Add column to store pending properties for future conversations
ALTER TABLE public.conversation_states 
ADD COLUMN IF NOT EXISTS pending_properties JSONB DEFAULT NULL;

COMMENT ON COLUMN public.conversation_states.pending_properties IS 'Stores remaining properties from search to show one at a time';