-- Add department_code to contacts table
ALTER TABLE public.contacts 
ADD COLUMN department_code public.department_type;

-- Create index for performance
CREATE INDEX idx_contacts_department_code ON public.contacts(department_code);

-- Drop existing SELECT policies that conflict
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "All authenticated can view contacts" ON public.contacts;

-- Create new RLS policy for viewing contacts by department
CREATE POLICY "Users can view contacts in their department or unassigned"
ON public.contacts 
FOR SELECT
USING (
  is_admin() 
  OR department_code = get_user_department(auth.uid())
  OR department_code IS NULL
);

-- Drop existing INSERT policies that may conflict
DROP POLICY IF EXISTS "Admins can create contacts" ON public.contacts;

-- Create new INSERT policy
CREATE POLICY "Users can create contacts in their department"
ON public.contacts 
FOR INSERT
WITH CHECK (
  is_admin()
  OR department_code = get_user_department(auth.uid())
  OR department_code IS NULL
  OR auth.role() = 'service_role'
);