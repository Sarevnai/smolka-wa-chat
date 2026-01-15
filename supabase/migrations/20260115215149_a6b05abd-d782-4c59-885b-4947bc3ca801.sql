-- PHASE 4: Create contact_departments table for per-department contact data isolation
-- This allows the same phone number to have different notes, type, and rating per department

CREATE TABLE IF NOT EXISTS public.contact_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  department_code department_type NOT NULL,
  contact_type contact_type DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  rating INTEGER DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each contact can only have one entry per department
  CONSTRAINT contact_departments_unique UNIQUE (contact_id, department_code)
);

-- Enable RLS
ALTER TABLE public.contact_departments ENABLE ROW LEVEL SECURITY;

-- Create policies for contact_departments
CREATE POLICY "Admins can manage all contact departments"
  ON public.contact_departments FOR ALL
  USING (is_admin());

CREATE POLICY "Users can view contact departments for their department"
  ON public.contact_departments FOR SELECT
  USING (
    is_admin() OR 
    department_code = get_my_department()
  );

CREATE POLICY "Users can update contact departments for their department"
  ON public.contact_departments FOR UPDATE
  USING (
    is_admin() OR 
    department_code = get_my_department()
  );

CREATE POLICY "Users can insert contact departments for their department"
  ON public.contact_departments FOR INSERT
  WITH CHECK (
    is_admin() OR 
    department_code = get_my_department()
  );

-- Create indexes for performance
CREATE INDEX idx_contact_departments_contact_id ON public.contact_departments(contact_id);
CREATE INDEX idx_contact_departments_department_code ON public.contact_departments(department_code);
CREATE INDEX idx_contact_departments_contact_dept ON public.contact_departments(contact_id, department_code);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_contact_departments_updated_at
  BEFORE UPDATE ON public.contact_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();