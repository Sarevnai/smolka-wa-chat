-- Create table for ClickUp configuration
CREATE TABLE public.clickup_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_token TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  space_id TEXT NOT NULL,
  proprietarios_list_id TEXT NOT NULL,
  inquilinos_list_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clickup_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a simple app)
CREATE POLICY "Allow public read access" 
ON public.clickup_config 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.clickup_config 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.clickup_config 
FOR UPDATE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clickup_config_updated_at
BEFORE UPDATE ON public.clickup_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();