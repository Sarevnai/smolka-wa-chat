-- Create table for ClickUp integration tracking
CREATE TABLE public.clickup_integration (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  clickup_task_id TEXT NOT NULL UNIQUE,
  clickup_list_id TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error')),
  last_sync TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clickup_integration ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a CRM system)
CREATE POLICY "Allow public read access" 
ON public.clickup_integration 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.clickup_integration 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.clickup_integration 
FOR UPDATE 
USING (true);

-- Create index for performance
CREATE INDEX idx_clickup_integration_ticket_id ON public.clickup_integration(ticket_id);
CREATE INDEX idx_clickup_integration_clickup_task_id ON public.clickup_integration(clickup_task_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clickup_integration_updated_at
BEFORE UPDATE ON public.clickup_integration
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();