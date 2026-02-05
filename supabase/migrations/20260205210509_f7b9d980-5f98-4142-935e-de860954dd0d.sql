-- Add new columns for C2S confirmation flow
ALTER TABLE public.conversation_states 
ADD COLUMN IF NOT EXISTS awaiting_c2s_confirmation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS c2s_pending_property jsonb DEFAULT null;