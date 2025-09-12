-- Create tickets table for CRM system
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  stage TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('baixa', 'media', 'alta', 'critica')),
  property_code TEXT,
  property_address TEXT,
  property_type TEXT CHECK (property_type IN ('apartamento', 'casa', 'comercial', 'terreno')),
  assigned_to TEXT,
  last_contact TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'whatsapp',
  type TEXT NOT NULL CHECK (type IN ('proprietario', 'inquilino')),
  value DECIMAL(10,2),
  contact_id UUID REFERENCES public.contacts(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_stages table for dynamic stage management
CREATE TABLE public.ticket_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('proprietario', 'inquilino')),
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ticket_type, order_index)
);

-- Enable Row Level Security
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_stages ENABLE ROW LEVEL SECURITY;

-- Create policies for tickets
CREATE POLICY "Users can view all tickets" 
ON public.tickets 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create tickets" 
ON public.tickets 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tickets" 
ON public.tickets 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete tickets" 
ON public.tickets 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create policies for ticket_stages
CREATE POLICY "Users can view ticket stages" 
ON public.ticket_stages 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage ticket stages" 
ON public.ticket_stages 
FOR ALL 
USING (auth.uid() IS NOT NULL AND is_admin());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ticket_stages_updated_at
BEFORE UPDATE ON public.ticket_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default stages for proprietarios
INSERT INTO public.ticket_stages (name, color, ticket_type, order_index) VALUES
('Novo', '#3B82F6', 'proprietario', 1),
('Em Análise', '#F59E0B', 'proprietario', 2),
('Em Andamento', '#8B5CF6', 'proprietario', 3),
('Aguardando', '#6B7280', 'proprietario', 4),
('Resolvido', '#10B981', 'proprietario', 5);

-- Insert default stages for inquilinos
INSERT INTO public.ticket_stages (name, color, ticket_type, order_index) VALUES
('Novo', '#3B82F6', 'inquilino', 1),
('Em Análise', '#F59E0B', 'inquilino', 2),
('Em Andamento', '#8B5CF6', 'inquilino', 3),
('Aguardando', '#6B7280', 'inquilino', 4),
('Resolvido', '#10B981', 'inquilino', 5);

-- Enable realtime for tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_stages;