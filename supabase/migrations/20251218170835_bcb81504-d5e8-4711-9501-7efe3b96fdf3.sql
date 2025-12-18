-- Add department_code column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN department_code department_type;

-- Add comment explaining the column
COMMENT ON COLUMN public.profiles.department_code IS 'Department the user belongs to, determines access to conversations and resources';