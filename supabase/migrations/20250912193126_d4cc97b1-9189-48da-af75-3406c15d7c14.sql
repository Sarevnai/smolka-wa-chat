-- Add is_template field to messages table
ALTER TABLE public.messages 
ADD COLUMN is_template boolean DEFAULT false;

-- Create index for better performance on template queries
CREATE INDEX idx_messages_is_template ON public.messages(is_template) WHERE is_template = true;

-- Create storage bucket for media files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for media bucket
CREATE POLICY "Anyone can view media files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "System can upload media files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'whatsapp-media' AND auth.role() = 'service_role'::text);

CREATE POLICY "System can update media files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'whatsapp-media' AND auth.role() = 'service_role'::text);

CREATE POLICY "System can delete media files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'whatsapp-media' AND auth.role() = 'service_role'::text);