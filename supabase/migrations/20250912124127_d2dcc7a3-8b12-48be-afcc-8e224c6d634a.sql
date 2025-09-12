-- Add RLS policy to allow authenticated users to delete messages
CREATE POLICY "Allow authenticated users to delete messages" 
ON public.messages 
FOR DELETE 
USING (auth.uid() IS NOT NULL);