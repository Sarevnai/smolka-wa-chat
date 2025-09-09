-- Create messages table for WhatsApp inbox
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  wa_message_id TEXT,
  wa_from TEXT,
  wa_to TEXT,
  wa_phone_number_id TEXT,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  body TEXT,
  wa_timestamp TIMESTAMPTZ,
  raw JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (adjust for production later)
CREATE POLICY "Allow public read access" ON public.messages FOR SELECT USING (true);

-- Create policy for public insert access 
CREATE POLICY "Allow public insert access" ON public.messages FOR INSERT WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_wa_from ON public.messages(wa_from);
CREATE INDEX IF NOT EXISTS idx_messages_wa_timestamp ON public.messages(wa_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable realtime for the table
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;