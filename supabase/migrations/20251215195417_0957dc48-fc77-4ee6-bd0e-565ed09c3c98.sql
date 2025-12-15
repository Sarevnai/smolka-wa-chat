UPDATE system_settings 
SET setting_value = '"https://smolkaimoveis.app.n8n.cloud/webhook/16807fbf-8d0a-485c-a760-609bf79f2142/webhook"'::jsonb,
    updated_at = now()
WHERE setting_key = 'n8n_webhook_url';