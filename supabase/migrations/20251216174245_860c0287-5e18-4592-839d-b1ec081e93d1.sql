INSERT INTO system_settings (setting_key, setting_category, setting_value)
VALUES ('ai_agent_mode', 'n8n', '{"value": "native"}'::jsonb)
ON CONFLICT (setting_key) DO UPDATE SET setting_value = '{"value": "native"}'::jsonb, updated_at = now();