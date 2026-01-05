-- Adicionar 'marketing' ao enum department_type
ALTER TYPE public.department_type ADD VALUE IF NOT EXISTS 'marketing';

-- Adicionar novos tipos de contato ao enum contact_type
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'prospect';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'engajado';
ALTER TYPE public.contact_type ADD VALUE IF NOT EXISTS 'campanha';