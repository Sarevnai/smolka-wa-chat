-- Criar tabela para rastreamento de leads enviados ao C2S
CREATE TABLE public.c2s_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.contacts(id),
  conversation_id UUID REFERENCES public.conversations(id),
  c2s_lead_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  lead_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- Index for faster lookups
CREATE INDEX idx_c2s_integration_contact ON public.c2s_integration(contact_id);
CREATE INDEX idx_c2s_integration_conversation ON public.c2s_integration(conversation_id);
CREATE INDEX idx_c2s_integration_status ON public.c2s_integration(sync_status);

-- Enable RLS
ALTER TABLE public.c2s_integration ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view c2s_integration"
  ON public.c2s_integration FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create c2s_integration"
  ON public.c2s_integration FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update c2s_integration"
  ON public.c2s_integration FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Service role and admins can delete c2s_integration"
  ON public.c2s_integration FOR DELETE
  USING (auth.role() = 'service_role' OR is_admin());