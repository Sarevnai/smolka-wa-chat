-- Add deletion tracking columns to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS deleted_for_everyone boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add index for better query performance on deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_deleted_for_everyone ON public.messages(deleted_for_everyone);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_by ON public.messages(deleted_by);