-- Add new contact type values to the contact_type enum
-- First, we need to add the new values to the existing enum

ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'lead';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'interessado';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'qualificado';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'visitou';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'proposta';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'comprador';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'investidor';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'proprietario_vendedor';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'negociacao';