-- Fix critical RLS security issues

-- Drop existing overly permissive contacts policies
DROP POLICY IF EXISTS "Allow authenticated users to select contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow authenticated users to insert contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow authenticated users to update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow authenticated users to delete contacts" ON public.contacts;

-- Create secure contacts policies - admins can access all, regular users need specific permissions
CREATE POLICY "Admins can view all contacts" ON public.contacts
FOR SELECT USING (is_admin());

CREATE POLICY "Users can view contacts (placeholder for future assignment system)" ON public.contacts
FOR SELECT USING (auth.uid() IS NOT NULL AND is_admin()); -- Temporarily admin-only until assignment system

CREATE POLICY "Admins can create contacts" ON public.contacts
FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update contacts" ON public.contacts
FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete contacts" ON public.contacts
FOR DELETE USING (is_admin());

-- Keep system insert policy for automated contact creation
-- (Allow system to insert contacts policy already exists)

-- Fix AI conversations privacy breach
DROP POLICY IF EXISTS "Users can view their own ai_conversations" ON public.ai_conversations;

-- Create strict AI conversation policy - users can only see their own conversations
CREATE POLICY "Users can view only their own ai_conversations" ON public.ai_conversations
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ai_conversations" ON public.ai_conversations
FOR SELECT USING (is_admin());

-- Add similar restrictions for other AI conversation operations
DROP POLICY IF EXISTS "Users can update their own ai_conversations" ON public.ai_conversations;
CREATE POLICY "Users can update only their own ai_conversations" ON public.ai_conversations
FOR UPDATE USING (auth.uid() = user_id);

-- Add campaign access controls - only admins for now
DROP POLICY IF EXISTS "Users can view campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create campaigns" ON public.campaigns;  
DROP POLICY IF EXISTS "Users can update campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete campaigns" ON public.campaigns;

CREATE POLICY "Admins can manage campaigns" ON public.campaigns
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add campaign results access controls
DROP POLICY IF EXISTS "Users can view campaign_results" ON public.campaign_results;
DROP POLICY IF EXISTS "Users can create campaign_results" ON public.campaign_results;
DROP POLICY IF EXISTS "Users can update campaign_results" ON public.campaign_results;

CREATE POLICY "Admins can manage campaign_results" ON public.campaign_results
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Add message template access controls  
DROP POLICY IF EXISTS "Users can view message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can create message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can update message_templates" ON public.message_templates;
DROP POLICY IF EXISTS "Users can delete message_templates" ON public.message_templates;

CREATE POLICY "Admins can manage message_templates" ON public.message_templates
FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- Secure tickets access - only admins can manage tickets
DROP POLICY IF EXISTS "Users can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete tickets" ON public.tickets;

CREATE POLICY "Admins can manage tickets" ON public.tickets
FOR ALL USING (is_admin()) WITH CHECK (is_admin());