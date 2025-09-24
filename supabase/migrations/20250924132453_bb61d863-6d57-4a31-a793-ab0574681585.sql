-- Create message_flags table for marking messages as important or unread
CREATE TABLE public.message_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('important', 'unread', 'starred', 'priority')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, flag_type)
);

-- Enable RLS
ALTER TABLE public.message_flags ENABLE ROW LEVEL SECURITY;

-- Create policies for message_flags
CREATE POLICY "Users can view their own message flags"
ON public.message_flags
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own message flags"
ON public.message_flags
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message flags"
ON public.message_flags
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message flags"
ON public.message_flags
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_message_flags_user_id ON public.message_flags(user_id);
CREATE INDEX idx_message_flags_message_id ON public.message_flags(message_id);
CREATE INDEX idx_message_flags_type ON public.message_flags(flag_type);

-- Create function to update timestamps
CREATE TRIGGER update_message_flags_updated_at
BEFORE UPDATE ON public.message_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();