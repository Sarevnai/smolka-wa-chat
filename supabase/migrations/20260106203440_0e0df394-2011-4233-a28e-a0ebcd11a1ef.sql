-- Tabela para armazenar o estado de execução dos fluxos
CREATE TABLE public.flow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  flow_id UUID REFERENCES public.ai_flows(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  current_node_id TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'paused', 'waiting_response', 'completed', 'escalated', 'error')),
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_flow_executions_phone ON public.flow_executions(phone_number);
CREATE INDEX idx_flow_executions_status ON public.flow_executions(status);
CREATE INDEX idx_flow_executions_conversation ON public.flow_executions(conversation_id);
CREATE INDEX idx_flow_executions_flow ON public.flow_executions(flow_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_flow_executions_updated_at
BEFORE UPDATE ON public.flow_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Admins can manage all flow executions"
ON public.flow_executions
FOR ALL
USING (public.is_admin());

CREATE POLICY "Users can view flow executions from their department"
ON public.flow_executions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = flow_executions.conversation_id
    AND (
      public.is_admin()
      OR c.department_code = public.get_user_department(auth.uid())
    )
  )
);

-- Tabela para log de execução (histórico de passos)
CREATE TABLE public.flow_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.flow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  action_taken TEXT,
  input_data JSONB,
  output_data JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_flow_execution_logs_execution ON public.flow_execution_logs(execution_id);

-- RLS para logs
ALTER TABLE public.flow_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all execution logs"
ON public.flow_execution_logs
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Users can view logs from their department executions"
ON public.flow_execution_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.flow_executions fe
    JOIN public.conversations c ON c.id = fe.conversation_id
    WHERE fe.id = flow_execution_logs.execution_id
    AND (
      public.is_admin()
      OR c.department_code = public.get_user_department(auth.uid())
    )
  )
);