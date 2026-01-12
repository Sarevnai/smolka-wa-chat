-- Tabela para registrar logs de leads recebidos dos portais imobiliários
CREATE TABLE public.portal_leads_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  portal_origin TEXT NOT NULL,
  origin_lead_id TEXT,
  origin_listing_id TEXT,
  client_listing_id TEXT,
  contact_id UUID REFERENCES public.contacts(id),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  message TEXT,
  temperature TEXT,
  transaction_type TEXT,
  raw_payload JSONB,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  error_message TEXT
);

-- Indices para performance
CREATE INDEX idx_portal_leads_origin ON public.portal_leads_log(portal_origin, created_at DESC);
CREATE INDEX idx_portal_leads_status ON public.portal_leads_log(status);
CREATE INDEX idx_portal_leads_contact ON public.portal_leads_log(contact_id);

-- Comentários para documentação
COMMENT ON TABLE public.portal_leads_log IS 'Histórico de leads recebidos dos portais imobiliários (ZAP, Viva Real, OLX)';
COMMENT ON COLUMN public.portal_leads_log.portal_origin IS 'Nome do portal de origem: ZAP, Viva Real, OLX';
COMMENT ON COLUMN public.portal_leads_log.origin_lead_id IS 'ID único do lead no portal de origem';
COMMENT ON COLUMN public.portal_leads_log.origin_listing_id IS 'ID do anúncio/imóvel no portal';
COMMENT ON COLUMN public.portal_leads_log.temperature IS 'Temperatura do lead: Alta, Média, Baixa';
COMMENT ON COLUMN public.portal_leads_log.transaction_type IS 'Tipo de transação: SELL (venda) ou RENT (locação)';

-- RLS
ALTER TABLE public.portal_leads_log ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver os logs
CREATE POLICY "Admins can view all portal leads"
  ON public.portal_leads_log FOR SELECT
  USING (public.is_admin());

-- Apenas admins podem inserir (via service role na edge function)
CREATE POLICY "Admins can insert portal leads"
  ON public.portal_leads_log FOR INSERT
  WITH CHECK (public.is_admin());

-- Apenas admins podem atualizar
CREATE POLICY "Admins can update portal leads"
  ON public.portal_leads_log FOR UPDATE
  USING (public.is_admin());