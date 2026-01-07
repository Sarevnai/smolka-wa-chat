-- Deletar mensagens do contato Ian Veras (554888182882)
DELETE FROM messages 
WHERE wa_from = '554888182882' OR wa_to = '554888182882'
   OR wa_from LIKE '%4888182882%' OR wa_to LIKE '%4888182882%';