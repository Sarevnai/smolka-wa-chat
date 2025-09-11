-- CRITICAL SECURITY FIXES
-- Remove public access policies and implement proper authentication-based RLS

-- Fix ClickUp Config table - Remove public access, allow only admins
DROP POLICY IF EXISTS "Allow public insert access" ON public.clickup_config;
DROP POLICY IF EXISTS "Allow public read access" ON public.clickup_config;
DROP POLICY IF EXISTS "Allow public update access" ON public.clickup_config;

CREATE POLICY "Allow admin access to clickup_config" 
ON public.clickup_config 
FOR ALL 
USING (auth.uid() IS NOT NULL AND is_admin())
WITH CHECK (auth.uid() IS NOT NULL AND is_admin());

-- Fix Messages table - Remove public access, require authentication
DROP POLICY IF EXISTS "Allow public insert access" ON public.messages;
DROP POLICY IF EXISTS "Allow public read access" ON public.messages;

CREATE POLICY "Allow authenticated users to read messages" 
ON public.messages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix Contacts table - Remove public access, require authentication
DROP POLICY IF EXISTS "Allow public delete access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public read access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public update access on contacts" ON public.contacts;

CREATE POLICY "Allow authenticated users full access to contacts" 
ON public.contacts 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix Contact Contracts table - Remove public access, require authentication
DROP POLICY IF EXISTS "Allow public delete access on contact_contracts" ON public.contact_contracts;
DROP POLICY IF EXISTS "Allow public insert access on contact_contracts" ON public.contact_contracts;
DROP POLICY IF EXISTS "Allow public read access on contact_contracts" ON public.contact_contracts;
DROP POLICY IF EXISTS "Allow public update access on contact_contracts" ON public.contact_contracts;

CREATE POLICY "Allow authenticated users full access to contact_contracts" 
ON public.contact_contracts 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Fix ClickUp Integration table - Remove public access, require authentication
DROP POLICY IF EXISTS "Allow public insert access" ON public.clickup_integration;
DROP POLICY IF EXISTS "Allow public read access" ON public.clickup_integration;
DROP POLICY IF EXISTS "Allow public update access" ON public.clickup_integration;

CREATE POLICY "Allow authenticated users full access to clickup_integration" 
ON public.clickup_integration 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Add audit logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Log sensitive table access for security monitoring
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.security_log (table_name, operation, user_id, old_data, created_at)
    VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(OLD), now());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.security_log (table_name, operation, user_id, old_data, new_data, created_at)
    VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(OLD), row_to_json(NEW), now());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.security_log (table_name, operation, user_id, new_data, created_at)
    VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), row_to_json(NEW), now());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create security log table for audit trail
CREATE TABLE IF NOT EXISTS public.security_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  operation text NOT NULL,
  user_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security log
ALTER TABLE public.security_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read security logs
CREATE POLICY "Allow admin access to security_log" 
ON public.security_log 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND is_admin());

-- Add triggers for audit logging on sensitive tables
CREATE TRIGGER clickup_config_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clickup_config
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();

CREATE TRIGGER contacts_audit_trigger
  AFTER DELETE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.log_security_event();