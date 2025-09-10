-- Create enum for contact types
CREATE TYPE public.contact_type AS ENUM ('proprietario', 'inquilino');

-- Add new columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN contact_type public.contact_type,
ADD COLUMN notes text,
ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN description text;

-- Create index for better performance on contact_type filtering
CREATE INDEX idx_contacts_contact_type ON public.contacts(contact_type);

-- Create index for rating filtering
CREATE INDEX idx_contacts_rating ON public.contacts(rating);