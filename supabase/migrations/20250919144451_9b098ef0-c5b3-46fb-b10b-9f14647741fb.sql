-- Mark non-numeric WhatsApp template_ids as rejected to avoid selection
UPDATE public.whatsapp_templates
SET status = 'rejected'
WHERE status = 'active' AND template_id !~ '^[0-9]+$';