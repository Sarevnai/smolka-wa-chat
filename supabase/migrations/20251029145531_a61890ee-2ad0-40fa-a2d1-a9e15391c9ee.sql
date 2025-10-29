-- Migração: Renomear Role → Function

-- 1. Renomear enum app_role para app_function
ALTER TYPE app_role RENAME TO app_function;

-- 2. Renomear tabela user_roles para user_functions
ALTER TABLE user_roles RENAME TO user_functions;

-- 3. Renomear coluna role para function na tabela user_functions
ALTER TABLE user_functions RENAME COLUMN role TO function;

-- 4. Renomear tabela role_permissions para function_permissions
ALTER TABLE role_permissions RENAME TO function_permissions;

-- 5. Renomear coluna role para function na tabela function_permissions
ALTER TABLE function_permissions RENAME COLUMN role TO function;

-- 6. Atualizar função has_role para has_function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
CREATE OR REPLACE FUNCTION public.has_function(_user_id uuid, _function app_function)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_functions
    WHERE user_id = _user_id AND function = _function
  )
$$;

-- 7. Atualizar função get_user_roles para get_user_functions
DROP FUNCTION IF EXISTS public.get_user_roles(uuid);
CREATE OR REPLACE FUNCTION public.get_user_functions(_user_id uuid)
RETURNS SETOF app_function
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT function FROM public.user_functions WHERE user_id = _user_id
$$;

-- 8. Atualizar função is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_function(auth.uid(), 'admin'::app_function)
$$;

-- 9. Atualizar função is_manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_function(auth.uid(), 'manager'::app_function)
$$;

-- 10. Atualizar função is_attendant
CREATE OR REPLACE FUNCTION public.is_attendant()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_function(auth.uid(), 'attendant'::app_function)
$$;

-- 11. Atualizar função get_user_effective_permissions
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id uuid)
RETURNS TABLE(resource text, can_view boolean, can_create boolean, can_edit boolean, can_delete boolean, is_custom boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH user_func AS (
    SELECT function FROM public.user_functions WHERE user_id = p_user_id LIMIT 1
  ),
  func_perms AS (
    SELECT 
      fp.resource,
      fp.can_view,
      fp.can_create,
      fp.can_edit,
      fp.can_delete,
      FALSE as is_custom
    FROM public.function_permissions fp
    CROSS JOIN user_func
    WHERE fp.function = user_func.function
  )
  SELECT 
    COALESCE(up.resource, fp.resource) as resource,
    COALESCE(up.can_view, fp.can_view) as can_view,
    COALESCE(up.can_create, fp.can_create) as can_create,
    COALESCE(up.can_edit, fp.can_edit) as can_edit,
    COALESCE(up.can_delete, fp.can_delete) as can_delete,
    COALESCE(up.is_custom, FALSE) as is_custom
  FROM func_perms fp
  LEFT JOIN public.user_permissions up ON up.user_id = p_user_id AND up.resource = fp.resource
  
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
    SELECT 1 FROM func_perms fp WHERE fp.resource = up.resource
  );
END;
$$;

-- 12. Atualizar todas as RLS policies que usam has_role para has_function

-- Policies da tabela system_settings
DROP POLICY IF EXISTS "Admins can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON system_settings;

CREATE POLICY "Admins can view system settings" 
ON system_settings FOR SELECT 
USING (has_function(auth.uid(), 'admin'::app_function));

CREATE POLICY "Admins can update system settings" 
ON system_settings FOR UPDATE 
USING (has_function(auth.uid(), 'admin'::app_function));

CREATE POLICY "Admins can insert system settings" 
ON system_settings FOR INSERT 
WITH CHECK (has_function(auth.uid(), 'admin'::app_function));

-- Policies da tabela role_permissions (agora function_permissions)
DROP POLICY IF EXISTS "Admins can view role permissions" ON function_permissions;
DROP POLICY IF EXISTS "Admins can update role permissions" ON function_permissions;
DROP POLICY IF EXISTS "Admins can insert role permissions" ON function_permissions;

CREATE POLICY "Admins can view function permissions" 
ON function_permissions FOR SELECT 
USING (has_function(auth.uid(), 'admin'::app_function));

CREATE POLICY "Admins can update function permissions" 
ON function_permissions FOR UPDATE 
USING (has_function(auth.uid(), 'admin'::app_function));

CREATE POLICY "Admins can insert function permissions" 
ON function_permissions FOR INSERT 
WITH CHECK (has_function(auth.uid(), 'admin'::app_function));