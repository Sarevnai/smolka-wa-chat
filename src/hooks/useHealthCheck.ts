import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IntegrationStatus {
  name: string;
  status: 'online' | 'offline' | 'warning' | 'checking';
  message?: string;
  lastChecked?: Date;
}

export interface HealthCheckResult {
  integrations: IntegrationStatus[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  lastChecked: Date;
}

export function useHealthCheck() {
  const [result, setResult] = useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    
    const integrations: IntegrationStatus[] = [];

    // 1. Supabase - sempre online se chegou aqui
    integrations.push({
      name: 'Supabase',
      status: 'online',
      message: 'Banco de dados conectado',
      lastChecked: new Date()
    });

    // 2. WhatsApp Cloud API
    try {
      const { data: waSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'whatsapp_access_token')
        .single();

      const hasWhatsAppToken = waSettings?.setting_value && 
        typeof waSettings.setting_value === 'string' && 
        waSettings.setting_value.length > 10;

      integrations.push({
        name: 'WhatsApp API',
        status: hasWhatsAppToken ? 'online' : 'offline',
        message: hasWhatsAppToken ? 'Token configurado' : 'Token não configurado',
        lastChecked: new Date()
      });
    } catch {
      integrations.push({
        name: 'WhatsApp API',
        status: 'offline',
        message: 'Erro ao verificar',
        lastChecked: new Date()
      });
    }

    // 3. ElevenLabs
    try {
      const { data: elevenLabsSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'elevenlabs_api_key')
        .single();

      const hasElevenLabsKey = elevenLabsSettings?.setting_value && 
        typeof elevenLabsSettings.setting_value === 'string' && 
        elevenLabsSettings.setting_value.length > 10;

      integrations.push({
        name: 'ElevenLabs',
        status: hasElevenLabsKey ? 'online' : 'warning',
        message: hasElevenLabsKey ? 'API Key configurada' : 'Opcional - não configurado',
        lastChecked: new Date()
      });
    } catch {
      integrations.push({
        name: 'ElevenLabs',
        status: 'warning',
        message: 'Opcional - não configurado',
        lastChecked: new Date()
      });
    }

    // 4. Vista CRM
    try {
      const { data: vistaSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'vista_api_key')
        .single();

      const hasVistaKey = vistaSettings?.setting_value && 
        typeof vistaSettings.setting_value === 'string' && 
        vistaSettings.setting_value.length > 5;

      integrations.push({
        name: 'Vista CRM',
        status: hasVistaKey ? 'online' : 'warning',
        message: hasVistaKey ? 'Conectado' : 'Opcional - não configurado',
        lastChecked: new Date()
      });
    } catch {
      integrations.push({
        name: 'Vista CRM',
        status: 'warning',
        message: 'Opcional - não configurado',
        lastChecked: new Date()
      });
    }

    // 5. C2S Integration
    try {
      const { data: c2sSettings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'c2s_api_key')
        .single();

      const hasC2S = c2sSettings?.setting_value && 
        typeof c2sSettings.setting_value === 'string' && 
        c2sSettings.setting_value.length > 5;

      integrations.push({
        name: 'C2S CRM',
        status: hasC2S ? 'online' : 'warning',
        message: hasC2S ? 'Conectado' : 'Opcional - não configurado',
        lastChecked: new Date()
      });
    } catch {
      integrations.push({
        name: 'C2S CRM',
        status: 'warning',
        message: 'Opcional - não configurado',
        lastChecked: new Date()
      });
    }

    // Calculate overall status
    const criticalIntegrations = ['Supabase', 'WhatsApp API'];
    const criticalOffline = integrations.filter(
      i => criticalIntegrations.includes(i.name) && i.status === 'offline'
    );
    const anyOffline = integrations.filter(i => i.status === 'offline');

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalOffline.length > 0) {
      overallStatus = 'critical';
    } else if (anyOffline.length > 0) {
      overallStatus = 'degraded';
    }

    const healthResult: HealthCheckResult = {
      integrations,
      overallStatus,
      lastChecked: new Date()
    };

    setResult(healthResult);
    setIsChecking(false);

    return healthResult;
  }, []);

  return {
    result,
    isChecking,
    checkHealth
  };
}
