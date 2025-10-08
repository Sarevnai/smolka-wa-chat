-- Extend campaigns table with WhatsApp template and header media fields
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS wa_template_id text,
ADD COLUMN IF NOT EXISTS header_media_id text,
ADD COLUMN IF NOT EXISTS header_media_type text,
ADD COLUMN IF NOT EXISTS header_media_url text,
ADD COLUMN IF NOT EXISTS header_media_mime text;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_campaigns_wa_template_id ON campaigns(wa_template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(status, scheduled_at) 
WHERE status = 'scheduled';

-- Add comments for clarity
COMMENT ON COLUMN campaigns.wa_template_id IS 'Official WhatsApp template ID from Meta';
COMMENT ON COLUMN campaigns.header_media_id IS 'WhatsApp Media API ID for header media';
COMMENT ON COLUMN campaigns.header_media_type IS 'Type of header media: image, video, or document';
COMMENT ON COLUMN campaigns.header_media_url IS 'Original URL of header media for reuse';
COMMENT ON COLUMN campaigns.header_media_mime IS 'MIME type of header media';