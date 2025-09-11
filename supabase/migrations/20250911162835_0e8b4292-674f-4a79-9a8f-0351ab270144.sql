-- Fix RLS policies for webhook message insertion
-- Allow system insertions (webhooks) and authenticated user operations

-- Update messages table policies
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.messages;
CREATE POLICY "Allow authenticated users and system to insert messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Also need to allow system insertions for contacts table since the trigger creates contacts
DROP POLICY IF EXISTS "Allow authenticated users full access to contacts" ON public.contacts;

CREATE POLICY "Allow authenticated users to select contacts" 
ON public.contacts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to update contacts" 
ON public.contacts 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to delete contacts" 
ON public.contacts 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Allow system to insert contacts (for webhook auto-creation)
CREATE POLICY "Allow system to insert contacts" 
ON public.contacts 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');