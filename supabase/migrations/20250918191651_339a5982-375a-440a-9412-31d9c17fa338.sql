-- Disable invalid WhatsApp templates with placeholder template_ids
UPDATE whatsapp_templates 
SET status = 'disabled' 
WHERE template_id IN ('classification_template_id', 'welcome_template_id');