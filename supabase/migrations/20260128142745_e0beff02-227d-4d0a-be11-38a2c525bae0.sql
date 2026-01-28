-- Limpar portal_leads_log para permitir teste de triagem genérica
-- Este registro está associando o telefone ao Villa Maggiore indevidamente
DELETE FROM portal_leads_log WHERE contact_phone = '554888182882';