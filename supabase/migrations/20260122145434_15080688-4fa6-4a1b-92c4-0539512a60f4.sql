-- =============================================
-- FASE 1: Estrutura para Empreendimentos (Arya Vendas)
-- =============================================

-- 1.1 Criar tabela de empreendimentos
CREATE TABLE public.developments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Identificação
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  developer TEXT NOT NULL,
  
  -- Localização
  address TEXT,
  neighborhood TEXT,
  city TEXT DEFAULT 'Florianópolis',
  
  -- Informações comerciais
  status TEXT NOT NULL DEFAULT 'lancamento',
  delivery_date TEXT,
  starting_price NUMERIC,
  
  -- Descrição e características
  description TEXT,
  differentials TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  
  -- Tipologias disponíveis (JSON array)
  unit_types JSONB DEFAULT '[]',
  
  -- FAQ para a IA (JSON array)
  faq JSONB DEFAULT '[]',
  
  -- Instruções customizadas para Arya
  ai_instructions TEXT,
  talking_points TEXT[] DEFAULT '{}',
  
  -- Configurações
  is_active BOOLEAN NOT NULL DEFAULT true,
  c2s_project_id TEXT
);

-- Comentários para documentação
COMMENT ON TABLE public.developments IS 'Empreendimentos imobiliários para atendimento pela Arya de Vendas';
COMMENT ON COLUMN public.developments.slug IS 'Identificador único para URLs e referências';
COMMENT ON COLUMN public.developments.unit_types IS 'Array de tipologias: [{tipo, area, preco_de}]';
COMMENT ON COLUMN public.developments.faq IS 'FAQ específico: [{pergunta, resposta}]';
COMMENT ON COLUMN public.developments.ai_instructions IS 'Instruções customizadas para o prompt da IA';

-- Índices
CREATE INDEX idx_developments_slug ON public.developments(slug);
CREATE INDEX idx_developments_is_active ON public.developments(is_active);

-- RLS
ALTER TABLE public.developments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active developments" 
  ON public.developments 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage developments" 
  ON public.developments 
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- Trigger para updated_at
CREATE TRIGGER update_developments_updated_at
  BEFORE UPDATE ON public.developments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 1.2 Criar tabela de materiais de empreendimentos
-- =============================================
CREATE TABLE public.development_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  development_id UUID NOT NULL REFERENCES public.developments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Tipo e identificação
  material_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Arquivo
  file_url TEXT NOT NULL,
  file_type TEXT,
  
  -- Ordenação e destaque
  order_index INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  
  -- Cache do media_id do WhatsApp para envio rápido
  whatsapp_media_id TEXT,
  
  CONSTRAINT valid_material_type CHECK (
    material_type IN ('planta_baixa', 'perspectiva', 'video', 'book', 'tour_virtual', 'foto', 'documento')
  )
);

COMMENT ON TABLE public.development_materials IS 'Materiais de marketing dos empreendimentos (plantas, perspectivas, vídeos)';
COMMENT ON COLUMN public.development_materials.whatsapp_media_id IS 'ID da mídia no WhatsApp para envio otimizado';

-- Índices
CREATE INDEX idx_dev_materials_development ON public.development_materials(development_id);
CREATE INDEX idx_dev_materials_type ON public.development_materials(material_type);

-- RLS
ALTER TABLE public.development_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view development materials" 
  ON public.development_materials 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage development materials" 
  ON public.development_materials 
  FOR ALL 
  USING (is_admin())
  WITH CHECK (is_admin());

-- =============================================
-- 1.3 Expandir portal_leads_log para empreendimentos
-- =============================================
ALTER TABLE public.portal_leads_log 
ADD COLUMN IF NOT EXISTS development_id UUID REFERENCES public.developments(id),
ADD COLUMN IF NOT EXISTS lead_source_type TEXT DEFAULT 'portal';

COMMENT ON COLUMN public.portal_leads_log.development_id IS 'Empreendimento de interesse do lead';
COMMENT ON COLUMN public.portal_leads_log.lead_source_type IS 'Origem: portal, landing_page, campaign, organic';

CREATE INDEX IF NOT EXISTS idx_portal_leads_development ON public.portal_leads_log(development_id);
CREATE INDEX IF NOT EXISTS idx_portal_leads_source_type ON public.portal_leads_log(lead_source_type);

-- =============================================
-- 1.4 Inserir Villa Maggiore como primeiro empreendimento
-- =============================================
INSERT INTO public.developments (
  name,
  slug,
  developer,
  address,
  neighborhood,
  city,
  status,
  delivery_date,
  starting_price,
  description,
  differentials,
  amenities,
  unit_types,
  faq,
  ai_instructions,
  talking_points,
  is_active
) VALUES (
  'Villa Maggiore',
  'villa-maggiore',
  'Construtora Fontana',
  'Rua Lauro Linhares, 2123',
  'Agronômica',
  'Florianópolis',
  'lancamento',
  'Dezembro 2026',
  890000,
  'O Villa Maggiore é um empreendimento de alto padrão localizado no coração da Agronômica, um dos bairros mais valorizados de Florianópolis. Com acabamento premium e vista permanente, oferece qualidade de vida incomparável para sua família.',
  ARRAY[
    'Localização privilegiada na Agronômica',
    'Acabamento de alto padrão',
    'Vista permanente para a cidade',
    'Infraestrutura completa de lazer',
    'Segurança 24 horas',
    'Vagas de garagem cobertas'
  ],
  ARRAY[
    'Piscina adulto e infantil',
    'Academia equipada',
    'Salão de festas',
    'Playground',
    'Bicicletário',
    'Pet place',
    'Espaço gourmet',
    'Coworking'
  ],
  '[
    {"tipo": "Garden 2 quartos", "area": 75, "preco_de": 890000},
    {"tipo": "Apartamento 2 quartos", "area": 68, "preco_de": 780000},
    {"tipo": "Apartamento 3 quartos", "area": 95, "preco_de": 1250000},
    {"tipo": "Cobertura duplex", "area": 180, "preco_de": 2400000}
  ]'::jsonb,
  '[
    {"pergunta": "Qual a previsão de entrega?", "resposta": "A previsão de entrega é para Dezembro de 2026."},
    {"pergunta": "Aceita financiamento?", "resposta": "Sim! Trabalhamos com financiamento por todos os bancos. O corretor pode fazer uma simulação personalizada para você."},
    {"pergunta": "Quantas vagas de garagem?", "resposta": "As unidades possuem de 1 a 2 vagas de garagem cobertas, dependendo da tipologia escolhida."},
    {"pergunta": "Tem taxa de condomínio prevista?", "resposta": "A previsão de condomínio é em torno de R$ 800 a R$ 1.200, dependendo da tipologia. O corretor pode passar valores mais detalhados."},
    {"pergunta": "Posso visitar o decorado?", "resposta": "Sim! Temos apartamento decorado disponível para visitação. O corretor pode agendar o melhor horário para você."},
    {"pergunta": "Qual a forma de pagamento?", "resposta": "Oferecemos condições facilitadas durante a obra e financiamento na entrega. O corretor apresentará as opções disponíveis."}
  ]'::jsonb,
  'Destaque a localização privilegiada na Agronômica, próximo ao centro, hospitais e escolas. Mencione a solidez da Construtora Fontana com mais de 30 anos de mercado. Seja prestativa e objetiva, respondendo as dúvidas e encaminhando rapidamente para o corretor.',
  ARRAY[
    'Última oportunidade na Agronômica com essa vista',
    'Construtora Fontana - mais de 30 anos de tradição',
    'Valorização garantida pela localização',
    'Condições especiais de lançamento'
  ],
  true
);