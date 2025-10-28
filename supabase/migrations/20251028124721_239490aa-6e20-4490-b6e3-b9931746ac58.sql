-- Tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_category TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies: apenas admins podem gerenciar configurações
CREATE POLICY "Admins can view system settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert system settings"
  ON public.system_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system settings"
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Índices para melhor performance
CREATE INDEX idx_system_settings_key ON public.system_settings(setting_key);
CREATE INDEX idx_system_settings_category ON public.system_settings(setting_category);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tabela para permissões customizadas por role
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(role, resource)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies: apenas admins podem gerenciar permissões
CREATE POLICY "Admins can view role permissions"
  ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert role permissions"
  ON public.role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update role permissions"
  ON public.role_permissions
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Índices
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_role_permissions_resource ON public.role_permissions(resource);

-- Trigger
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir permissões padrão
INSERT INTO public.role_permissions (role, resource, can_view, can_create, can_edit, can_delete) VALUES
  -- Admin: acesso total a tudo
  ('admin', 'users', true, true, true, true),
  ('admin', 'contacts', true, true, true, true),
  ('admin', 'messages', true, true, true, true),
  ('admin', 'campaigns', true, true, true, true),
  ('admin', 'templates', true, true, true, true),
  ('admin', 'tickets', true, true, true, true),
  ('admin', 'reports', true, true, true, true),
  ('admin', 'integrations', true, true, true, true),
  ('admin', 'settings', true, true, true, true),
  
  -- Manager: acesso quase total, exceto gerenciar usuários e configurações
  ('manager', 'users', true, false, false, false),
  ('manager', 'contacts', true, true, true, true),
  ('manager', 'messages', true, true, true, true),
  ('manager', 'campaigns', true, true, true, true),
  ('manager', 'templates', true, true, true, true),
  ('manager', 'tickets', true, true, true, true),
  ('manager', 'reports', true, true, true, true),
  ('manager', 'integrations', true, false, false, false),
  ('manager', 'settings', true, false, false, false),
  
  -- Attendant: acesso operacional básico
  ('attendant', 'users', false, false, false, false),
  ('attendant', 'contacts', true, true, true, false),
  ('attendant', 'messages', true, true, true, false),
  ('attendant', 'campaigns', true, false, false, false),
  ('attendant', 'templates', true, false, false, false),
  ('attendant', 'tickets', true, true, true, false),
  ('attendant', 'reports', true, false, false, false),
  ('attendant', 'integrations', false, false, false, false),
  ('attendant', 'settings', false, false, false, false)
ON CONFLICT (role, resource) DO NOTHING;

-- Inserir configurações padrão do sistema
INSERT INTO public.system_settings (setting_key, setting_value, setting_category, description) VALUES
  ('company_name', '"Smolka WhatsApp Inbox"', 'general', 'Nome da empresa exibido no sistema'),
  ('timezone', '"America/Sao_Paulo"', 'general', 'Fuso horário do sistema'),
  ('email_notifications', 'true', 'notifications', 'Habilitar notificações por email'),
  ('push_notifications', 'true', 'notifications', 'Habilitar notificações push'),
  ('session_timeout', '30', 'security', 'Tempo de timeout da sessão em minutos'),
  ('require_strong_password', 'true', 'security', 'Exigir senhas fortes'),
  ('enable_2fa', 'false', 'security', 'Habilitar autenticação de dois fatores'),
  ('auto_backup', 'true', 'backup', 'Backup automático habilitado'),
  ('backup_frequency', '"daily"', 'backup', 'Frequência do backup')
ON CONFLICT (setting_key) DO NOTHING;