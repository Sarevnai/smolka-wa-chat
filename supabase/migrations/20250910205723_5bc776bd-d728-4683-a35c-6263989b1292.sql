-- Add role enum type
CREATE TYPE public.user_role AS ENUM ('admin', 'user');

-- Add role column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN role public.user_role NOT NULL DEFAULT 'user';

-- Set Ian Veras as admin (assuming this is his email)
-- This will need to be updated with the actual email when known
UPDATE public.profiles 
SET role = 'admin' 
WHERE full_name ILIKE '%ian%' OR full_name ILIKE '%veras%';

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Update RLS policies for profiles to allow admins to see all users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR public.is_admin()
);