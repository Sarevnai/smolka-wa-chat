-- Check if enums exist and create only if they don't
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status') THEN
        CREATE TYPE public.contact_status AS ENUM ('ativo', 'inativo', 'bloqueado');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE public.contract_status AS ENUM ('ativo', 'encerrado', 'suspenso');
    END IF;
END$$;

-- Create contacts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  status public.contact_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact_contracts table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.contact_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  contract_type TEXT,
  property_code TEXT,
  status public.contract_status NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_contracts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Allow public read access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public insert access on contacts" ON public.contacts;  
DROP POLICY IF EXISTS "Allow public update access on contacts" ON public.contacts;
DROP POLICY IF EXISTS "Allow public delete access on contacts" ON public.contacts;

CREATE POLICY "Allow public read access on contacts" ON public.contacts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on contacts" ON public.contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on contacts" ON public.contacts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on contacts" ON public.contacts FOR DELETE USING (true);

-- Drop existing policies for contracts if they exist and recreate
DROP POLICY IF EXISTS "Allow public read access on contact_contracts" ON public.contact_contracts;
DROP POLICY IF EXISTS "Allow public insert access on contact_contracts" ON public.contact_contracts;
DROP POLICY IF EXISTS "Allow public update access on contact_contracts" ON public.contact_contracts;
DROP POLICY IF EXISTS "Allow public delete access on contact_contracts" ON public.contact_contracts;

CREATE POLICY "Allow public read access on contact_contracts" ON public.contact_contracts FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on contact_contracts" ON public.contact_contracts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on contact_contracts" ON public.contact_contracts FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on contact_contracts" ON public.contact_contracts FOR DELETE USING (true);

-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS update_contacts_updated_at ON public.contacts;
CREATE TRIGGER update_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_contracts_updated_at ON public.contact_contracts;
CREATE TRIGGER update_contact_contracts_updated_at
BEFORE UPDATE ON public.contact_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON public.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contact_contracts_contact_id ON public.contact_contracts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_contracts_contract_number ON public.contact_contracts(contract_number);

-- Function to auto-create contacts from messages
CREATE OR REPLACE FUNCTION public.auto_create_contact_from_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create contact for inbound messages with valid phone numbers
  IF NEW.direction = 'inbound' AND NEW.wa_from IS NOT NULL AND NEW.wa_from != '' THEN
    -- Insert contact if it doesn't exist (ignore conflicts)
    INSERT INTO public.contacts (phone, name, status)
    VALUES (NEW.wa_from, NULL, 'ativo')
    ON CONFLICT (phone) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create contacts from new messages
DROP TRIGGER IF EXISTS auto_create_contact_trigger ON public.messages;
CREATE TRIGGER auto_create_contact_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_contact_from_message();