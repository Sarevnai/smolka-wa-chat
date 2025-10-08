-- Add media_id caching columns to whatsapp_templates table
ALTER TABLE whatsapp_templates 
ADD COLUMN IF NOT EXISTS media_id text,
ADD COLUMN IF NOT EXISTS media_uploaded_at timestamp with time zone;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_media_id 
ON whatsapp_templates(media_id);

COMMENT ON COLUMN whatsapp_templates.media_id IS 'Cached WhatsApp media ID from Media API upload';
COMMENT ON COLUMN whatsapp_templates.media_uploaded_at IS 'Timestamp when media was uploaded to WhatsApp (for cache expiration)';