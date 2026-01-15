import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SetupStep {
  id: string;
  label: string;
  completed: boolean;
  description: string;
}

export function useSetupProgress() {
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const checkSetup = async () => {
    setLoading(true);
    
    const setupSteps: SetupStep[] = [];

    // 1. Check WhatsApp configuration
    try {
      const { data: waToken } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_access_token')
        .single();

      const { data: waPhoneId } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_phone_number_id')
        .single();

      const tokenValue = typeof waToken?.setting_value === 'string' ? waToken.setting_value : '';
      const phoneIdValue = typeof waPhoneId?.setting_value === 'string' ? waPhoneId.setting_value : '';

      const hasWhatsApp = tokenValue.length > 10 && phoneIdValue.length > 5;

      setupSteps.push({
        id: 'whatsapp',
        label: 'WhatsApp',
        completed: hasWhatsApp,
        description: hasWhatsApp ? 'API configurada' : 'Configure a API do WhatsApp'
      });
    } catch {
      setupSteps.push({
        id: 'whatsapp',
        label: 'WhatsApp',
        completed: false,
        description: 'Configure a API do WhatsApp'
      });
    }

    // 2. Check AI Agent configuration
    try {
      const { data: agentConfig } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_agent_config')
        .single();

      const configValue = agentConfig?.setting_value as Record<string, unknown> | null;
      const hasAgentName = typeof configValue?.agentName === 'string' && configValue.agentName.length > 0;

      setupSteps.push({
        id: 'agent',
        label: 'Agente IA',
        completed: hasAgentName,
        description: hasAgentName ? 'Agente configurado' : 'Configure o agente de IA'
      });
    } catch {
      setupSteps.push({
        id: 'agent',
        label: 'Agente IA',
        completed: false,
        description: 'Configure o agente de IA'
      });
    }

    // 3. Check if templates are synced
    try {
      const { count } = await supabase
        .from('whatsapp_templates')
        .select('id', { count: 'exact', head: true });

      const hasTemplates = (count ?? 0) > 0;

      setupSteps.push({
        id: 'templates',
        label: 'Templates',
        completed: hasTemplates,
        description: hasTemplates ? `${count} templates sincronizados` : 'Sincronize os templates'
      });
    } catch {
      setupSteps.push({
        id: 'templates',
        label: 'Templates',
        completed: false,
        description: 'Sincronize os templates'
      });
    }

    // 4. Check if first lead was received
    try {
      const { count } = await supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('contact_type', 'lead');

      const hasLeads = (count ?? 0) > 0;

      setupSteps.push({
        id: 'leads',
        label: 'Primeiro Lead',
        completed: hasLeads,
        description: hasLeads ? 'Leads recebidos' : 'Aguardando primeiro lead'
      });
    } catch {
      setupSteps.push({
        id: 'leads',
        label: 'Primeiro Lead',
        completed: false,
        description: 'Aguardando primeiro lead'
      });
    }

    setSteps(setupSteps);
    
    const completedCount = setupSteps.filter(s => s.completed).length;
    const progressPercent = Math.round((completedCount / setupSteps.length) * 100);
    
    setProgress(progressPercent);
    setIsComplete(progressPercent === 100);
    setLoading(false);
  };

  useEffect(() => {
    checkSetup();
  }, []);

  return {
    steps,
    loading,
    progress,
    isComplete,
    refresh: checkSetup
  };
}
