-- Create table for AI suggestions
CREATE TABLE public.ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id BIGINT REFERENCES public.messages(id),
  contact_phone TEXT NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'response', 'classification', 'action', 'urgency'
  suggestion_content JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  is_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI conversations (with communicator agent)
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  conversation_type TEXT NOT NULL DEFAULT 'assistant', -- 'assistant', 'automation', 'report'
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_data JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for AI automations
CREATE TABLE public.ai_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_type TEXT NOT NULL, -- 'auto_response', 'follow_up', 'escalation', 'classification'
  trigger_conditions JSONB NOT NULL,
  action_config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_automations ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_suggestions
CREATE POLICY "Authenticated users can view ai_suggestions" 
ON public.ai_suggestions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create ai_suggestions" 
ON public.ai_suggestions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ai_suggestions" 
ON public.ai_suggestions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create policies for ai_conversations
CREATE POLICY "Users can view their own ai_conversations" 
ON public.ai_conversations 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can create ai_conversations" 
ON public.ai_conversations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai_conversations" 
ON public.ai_conversations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for ai_automations
CREATE POLICY "Authenticated users can view ai_automations" 
ON public.ai_automations 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage ai_automations" 
ON public.ai_automations 
FOR ALL 
USING (is_admin());

-- Create triggers for updated_at
CREATE TRIGGER update_ai_suggestions_updated_at
BEFORE UPDATE ON public.ai_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_automations_updated_at
BEFORE UPDATE ON public.ai_automations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ai_suggestions_contact_phone ON public.ai_suggestions(contact_phone);
CREATE INDEX idx_ai_suggestions_message_id ON public.ai_suggestions(message_id);
CREATE INDEX idx_ai_suggestions_type ON public.ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_active ON public.ai_conversations(is_active);
CREATE INDEX idx_ai_automations_enabled ON public.ai_automations(is_enabled);
CREATE INDEX idx_ai_automations_type ON public.ai_automations(automation_type);