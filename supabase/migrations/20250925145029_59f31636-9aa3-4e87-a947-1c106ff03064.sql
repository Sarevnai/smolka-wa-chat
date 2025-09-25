-- Create deleted_messages table for soft delete functionality
CREATE TABLE public.deleted_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id BIGINT NOT NULL,
  deleted_by UUID NOT NULL,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('for_me', 'for_everyone')),
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  can_restore BOOLEAN NOT NULL DEFAULT true,
  original_message_data JSONB NOT NULL
);

-- Create activity_logs table for audit trail
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deleted_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for deleted_messages
CREATE POLICY "Users can view their own deleted messages" 
ON public.deleted_messages 
FOR SELECT 
USING (auth.uid() = deleted_by);

CREATE POLICY "Users can create deleted messages" 
ON public.deleted_messages 
FOR INSERT 
WITH CHECK (auth.uid() = deleted_by);

CREATE POLICY "Users can update their own deleted messages" 
ON public.deleted_messages 
FOR UPDATE 
USING (auth.uid() = deleted_by);

CREATE POLICY "Admins can view all deleted messages" 
ON public.deleted_messages 
FOR ALL 
USING (is_admin());

-- RLS policies for activity_logs
CREATE POLICY "Users can view their own activity logs" 
ON public.activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create activity logs" 
ON public.activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all activity logs" 
ON public.activity_logs 
FOR ALL 
USING (is_admin());

-- Add indexes for performance
CREATE INDEX idx_deleted_messages_message_id ON public.deleted_messages(message_id);
CREATE INDEX idx_deleted_messages_deleted_by ON public.deleted_messages(deleted_by);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Add trigger for updated_at on deleted_messages
CREATE TRIGGER update_deleted_messages_updated_at
  BEFORE UPDATE ON public.deleted_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();