-- Create message_templates table
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cobranca', 'manutencao', 'promocao', 'comunicado', 'lembrete', 'personalizado')),
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for message_templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for message_templates
CREATE POLICY "Users can view message_templates" 
ON public.message_templates 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create message_templates" 
ON public.message_templates 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update message_templates" 
ON public.message_templates 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete message_templates" 
ON public.message_templates 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  template_id UUID REFERENCES public.message_templates(id) ON DELETE SET NULL,
  target_contacts TEXT[] NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0
);

-- Enable RLS for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaigns
CREATE POLICY "Users can view campaigns" 
ON public.campaigns 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create campaigns" 
ON public.campaigns 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update campaigns" 
ON public.campaigns 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete campaigns" 
ON public.campaigns 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create campaign_results table
CREATE TABLE public.campaign_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'read', 'replied')),
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for campaign_results
ALTER TABLE public.campaign_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for campaign_results
CREATE POLICY "Users can view campaign_results" 
ON public.campaign_results 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create campaign_results" 
ON public.campaign_results 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update campaign_results" 
ON public.campaign_results 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create contact_groups table
CREATE TABLE public.contact_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contact_ids TEXT[] NOT NULL DEFAULT '{}',
  filters JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for contact_groups
ALTER TABLE public.contact_groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact_groups
CREATE POLICY "Users can view contact_groups" 
ON public.contact_groups 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create contact_groups" 
ON public.contact_groups 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update contact_groups" 
ON public.contact_groups 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete contact_groups" 
ON public.contact_groups 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at columns
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_groups_updated_at
BEFORE UPDATE ON public.contact_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON public.campaigns(scheduled_at);
CREATE INDEX idx_campaign_results_campaign_id ON public.campaign_results(campaign_id);
CREATE INDEX idx_campaign_results_status ON public.campaign_results(status);
CREATE INDEX idx_message_templates_category ON public.message_templates(category);