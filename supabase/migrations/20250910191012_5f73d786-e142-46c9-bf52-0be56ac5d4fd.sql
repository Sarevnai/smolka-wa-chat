-- Fix function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;