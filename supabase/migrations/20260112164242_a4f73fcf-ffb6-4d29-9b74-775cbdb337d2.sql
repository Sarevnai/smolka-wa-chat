-- Create secure RPC for current user to get their own department
-- This bypasses RLS issues and timing problems
CREATE OR REPLACE FUNCTION public.get_my_department()
RETURNS department_type
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT department_code 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
$$;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION public.get_my_department() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_department() TO authenticated;

-- Fix the existing get_user_department function to read from profiles (not user_functions)
-- and add security guard: only allow reading own department unless admin
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id uuid)
RETURNS department_type
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result department_type;
  is_admin_user boolean;
BEGIN
  -- Check if current user is admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_functions 
    WHERE user_id = auth.uid() AND function = 'admin'
  ) INTO is_admin_user;
  
  -- Only allow reading other user's department if admin, or if reading own
  IF _user_id != auth.uid() AND NOT is_admin_user THEN
    RETURN NULL;
  END IF;
  
  -- Get department from profiles table (not user_functions)
  SELECT department_code INTO result
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION public.get_my_department() IS 'Secure RPC for users to get their own department_code from profiles';
COMMENT ON FUNCTION public.get_user_department(uuid) IS 'Get department for a user - only own department or admin can see others';