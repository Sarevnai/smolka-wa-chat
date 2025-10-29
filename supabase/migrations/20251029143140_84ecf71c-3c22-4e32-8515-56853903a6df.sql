-- Ensure RLS is enabled on the target table
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that rely on direct queries to user_roles
DROP POLICY IF EXISTS "Admins can view user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can insert user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can update user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can delete user permissions" ON public.user_permissions;

-- Recreate policies using SECURITY DEFINER function public.is_admin()
CREATE POLICY "Admins can view user permissions"
ON public.user_permissions
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can insert user permissions"
ON public.user_permissions
FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update user permissions"
ON public.user_permissions
FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete user permissions"
ON public.user_permissions
FOR DELETE
USING (public.is_admin());