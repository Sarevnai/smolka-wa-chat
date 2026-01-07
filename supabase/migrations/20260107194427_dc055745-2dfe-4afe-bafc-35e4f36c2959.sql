-- Fix the language for atualizacao template (Meta has it as pt_PT)
UPDATE whatsapp_templates 
SET language = 'pt_PT', updated_at = now() 
WHERE template_name = 'atualizacao';