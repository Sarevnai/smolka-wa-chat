-- Add media support to messages table
ALTER TABLE public.messages 
ADD COLUMN media_type text,
ADD COLUMN media_url text,
ADD COLUMN media_caption text,
ADD COLUMN media_filename text,
ADD COLUMN media_mime_type text;

-- Create index for better performance when filtering by media type
CREATE INDEX idx_messages_media_type ON public.messages(media_type);

-- Add comments for documentation
COMMENT ON COLUMN public.messages.media_type IS 'Type of media: image, audio, video, sticker, document, location, etc';
COMMENT ON COLUMN public.messages.media_url IS 'URL to the media file';
COMMENT ON COLUMN public.messages.media_caption IS 'Caption text for media messages';
COMMENT ON COLUMN public.messages.media_filename IS 'Original filename for documents';
COMMENT ON COLUMN public.messages.media_mime_type IS 'MIME type of the media file';