-- Enable real-time updates for messages table
-- This will ensure the frontend receives instant notifications for new messages

-- Set replica identity to FULL to capture complete row data during updates
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add the messages table to the realtime publication
-- This enables real-time functionality for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;