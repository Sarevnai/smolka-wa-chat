-- =====================================================
-- Sincronizar department_code dos contatos com base nas conversas existentes
-- Contatos que têm conversa com departamento definido devem herdar o departamento
-- =====================================================

-- Atualizar contatos que ainda não têm departamento mas têm conversa com departamento
UPDATE public.contacts c
SET department_code = conv.department_code
FROM (
  SELECT DISTINCT ON (phone_number) 
    phone_number, 
    department_code
  FROM public.conversations
  WHERE department_code IS NOT NULL
  ORDER BY phone_number, last_message_at DESC NULLS LAST
) conv
WHERE c.phone = conv.phone_number
  AND c.department_code = 'administrativo';

-- Log para verificação
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Contatos sincronizados com departamento da conversa: %', updated_count;
END $$;