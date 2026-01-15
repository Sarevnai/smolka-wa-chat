-- Etapa 1: Excluir portal leads log PRIMEIRO (referencia lead_qualification)
DELETE FROM portal_leads_log 
WHERE contact_phone IN ('554888182882', '5548988182882');

-- Etapa 2: Excluir lead qualifications
DELETE FROM lead_qualification 
WHERE phone_number IN ('554888182882', '5548988182882');

-- Etapa 3: Excluir mensagens
DELETE FROM messages 
WHERE wa_from IN ('554888182882', '5548988182882') 
   OR wa_to IN ('554888182882', '5548988182882');

-- Etapa 4: Excluir conversas
DELETE FROM conversations 
WHERE phone_number IN ('554888182882', '5548988182882');

-- Etapa 5: Excluir contatos
DELETE FROM contacts 
WHERE phone IN ('554888182882', '5548988182882');