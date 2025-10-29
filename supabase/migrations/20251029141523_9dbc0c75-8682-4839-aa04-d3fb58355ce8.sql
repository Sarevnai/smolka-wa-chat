-- Create composite index for user_permissions to optimize queries
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_resource 
  ON public.user_permissions(user_id, resource);

-- Add helpful comment
COMMENT ON INDEX idx_user_permissions_user_resource IS 
  'Composite index to optimize user permission lookups by user_id and resource';