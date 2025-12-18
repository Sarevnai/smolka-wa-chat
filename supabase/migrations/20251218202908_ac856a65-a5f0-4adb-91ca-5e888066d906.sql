-- =====================================================
-- Adicionar campo communication_preference na tabela contacts
-- Para armazenar preferência de comunicação (texto ou áudio)
-- =====================================================

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS communication_preference TEXT 
CHECK (communication_preference IN ('audio', 'texto'));

COMMENT ON COLUMN public.contacts.communication_preference IS 
'Preferência de comunicação do contato: audio ou texto';