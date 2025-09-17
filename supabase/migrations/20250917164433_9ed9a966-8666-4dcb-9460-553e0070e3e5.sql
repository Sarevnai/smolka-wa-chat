-- Ensure unique constraint for upsert to work
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_templates_template_id_uidx
ON public.whatsapp_templates (template_id);
