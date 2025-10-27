-- Criar tabela user_status para controle de status de usuários
CREATE TABLE public.user_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_until TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can view all user status"
ON public.user_status
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can manage user status"
ON public.user_status
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Índices para performance
CREATE INDEX idx_user_status_user_id ON public.user_status(user_id);
CREATE INDEX idx_user_status_is_active ON public.user_status(is_active);
CREATE INDEX idx_user_status_last_login ON public.user_status(last_login);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_status_updated_at
BEFORE UPDATE ON public.user_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir status para usuários existentes
INSERT INTO public.user_status (user_id, is_active, last_login)
SELECT id, true, NULL
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;