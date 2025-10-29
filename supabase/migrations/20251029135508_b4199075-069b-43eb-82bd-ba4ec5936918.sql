-- Create user_permissions table for individual user permissions
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource TEXT NOT NULL,
  can_view BOOLEAN DEFAULT FALSE,
  can_create BOOLEAN DEFAULT FALSE,
  can_edit BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  is_custom BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, resource)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can view user permissions
CREATE POLICY "Admins can view user permissions"
  ON public.user_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can insert user permissions
CREATE POLICY "Admins can insert user permissions"
  ON public.user_permissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can update user permissions
CREATE POLICY "Admins can update user permissions"
  ON public.user_permissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Only admins can delete user permissions
CREATE POLICY "Admins can delete user permissions"
  ON public.user_permissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for better performance
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_resource ON public.user_permissions(resource);

-- Function to get effective permissions for a user (combines role and user permissions)
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE (
  resource TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  is_custom BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH user_role AS (
    SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1
  ),
  role_perms AS (
    SELECT 
      rp.resource,
      rp.can_view,
      rp.can_create,
      rp.can_edit,
      rp.can_delete,
      FALSE as is_custom
    FROM public.role_permissions rp
    CROSS JOIN user_role
    WHERE rp.role = user_role.role
  )
  SELECT 
    COALESCE(up.resource, rp.resource) as resource,
    COALESCE(up.can_view, rp.can_view) as can_view,
    COALESCE(up.can_create, rp.can_create) as can_create,
    COALESCE(up.can_edit, rp.can_edit) as can_edit,
    COALESCE(up.can_delete, rp.can_delete) as can_delete,
    COALESCE(up.is_custom, FALSE) as is_custom
  FROM role_perms rp
  LEFT JOIN public.user_permissions up ON up.user_id = p_user_id AND up.resource = rp.resource
  
  UNION
  
  SELECT 
    up.resource,
    up.can_view,
    up.can_create,
    up.can_edit,
    up.can_delete,
    up.is_custom
  FROM public.user_permissions up
  WHERE up.user_id = p_user_id
  AND NOT EXISTS (
    SELECT 1 FROM role_perms rp WHERE rp.resource = up.resource
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;