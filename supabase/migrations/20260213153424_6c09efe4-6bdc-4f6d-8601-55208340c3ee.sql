
-- ========== AI ERROR LOG ==========
-- Structured error logging for all AI agents (Phase C.1)

CREATE TABLE public.ai_error_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  phone_number TEXT,
  conversation_id UUID,
  department_code TEXT,
  resolution TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_ai_error_log_agent ON public.ai_error_log(agent_name);
CREATE INDEX idx_ai_error_log_created ON public.ai_error_log(created_at DESC);
CREATE INDEX idx_ai_error_log_type ON public.ai_error_log(error_type);

-- Enable RLS
ALTER TABLE public.ai_error_log ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all error logs
CREATE POLICY "Admins can manage ai_error_log"
  ON public.ai_error_log
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role full access (for edge functions to insert)
CREATE POLICY "Service role can manage ai_error_log"
  ON public.ai_error_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Managers can view error logs
CREATE POLICY "Managers can view ai_error_log"
  ON public.ai_error_log
  FOR SELECT
  USING (is_manager());
