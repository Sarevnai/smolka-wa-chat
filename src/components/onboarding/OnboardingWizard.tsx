import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WizardProgress } from './WizardProgress';
import { StepWhatsApp } from './steps/StepWhatsApp';
import { StepAIProvider } from './steps/StepAIProvider';
import { StepElevenLabs } from './steps/StepElevenLabs';
import { StepTemplates } from './steps/StepTemplates';
import { StepAIAgent } from './steps/StepAIAgent';
import { StepHealthCheck } from './steps/StepHealthCheck';
import { StepCompletion } from './steps/StepCompletion';

export interface OnboardingData {
  // WhatsApp
  whatsappAccessToken: string;
  whatsappPhoneNumberId: string;
  whatsappVerifyToken: string;
  // AI Provider
  aiProvider: 'openai' | 'lovable';
  openaiApiKey: string;
  aiModel: string;
  // ElevenLabs
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
  skipElevenlabs: boolean;
  // Templates
  templatesSynced: boolean;
  templatesCount: number;
  // AI Agent
  agentName: string;
  companyName: string;
  communicationTone: string;
  greetingMessage: string;
}

const initialData: OnboardingData = {
  whatsappAccessToken: '',
  whatsappPhoneNumberId: '',
  whatsappVerifyToken: '',
  aiProvider: 'openai',
  openaiApiKey: '',
  aiModel: 'gpt-4o-mini',
  elevenlabsApiKey: '',
  elevenlabsVoiceId: '',
  skipElevenlabs: false,
  templatesSynced: false,
  templatesCount: 0,
  agentName: '',
  companyName: '',
  communicationTone: 'friendly',
  greetingMessage: '',
};

const steps = [
  { number: 1, title: 'WhatsApp' },
  { number: 2, title: 'Provedor IA' },
  { number: 3, title: 'ElevenLabs' },
  { number: 4, title: 'Templates' },
  { number: 5, title: 'Agente IA' },
  { number: 6, title: 'Verificação' },
  { number: 7, title: 'Conclusão' },
];

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingWizard({ open, onClose, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [loading, setLoading] = useState(false);
  const [healthCheckResults, setHealthCheckResults] = useState<Record<string, boolean>>({});

  // Load existing settings on mount
  useEffect(() => {
    if (open) {
      loadExistingSettings();
    }
  }, [open]);

  const loadExistingSettings = async () => {
    try {
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value');

      if (settings) {
        const settingsMap = new Map(settings.map(s => [s.setting_key, s.setting_value]));
        
        setData(prev => ({
          ...prev,
          whatsappAccessToken: (settingsMap.get('whatsapp_access_token') as string) || '',
          whatsappPhoneNumberId: (settingsMap.get('whatsapp_phone_number_id') as string) || '',
          whatsappVerifyToken: (settingsMap.get('whatsapp_verify_token') as string) || '',
          openaiApiKey: (settingsMap.get('openai_api_key') as string) || '',
          elevenlabsApiKey: (settingsMap.get('elevenlabs_api_key') as string) || '',
          elevenlabsVoiceId: (settingsMap.get('elevenlabs_voice_id') as string) || '',
        }));

        // Load AI agent config
        const agentConfig = settingsMap.get('ai_agent_config') as Record<string, unknown> | null;
        if (agentConfig) {
          setData(prev => ({
            ...prev,
            agentName: (agentConfig.agentName as string) || '',
            companyName: (agentConfig.companyName as string) || '',
            communicationTone: (agentConfig.communicationTone as string) || 'friendly',
            greetingMessage: (agentConfig.greetingMessage as string) || '',
            aiProvider: (agentConfig.aiProvider as 'openai' | 'lovable') || 'openai',
            aiModel: (agentConfig.model as string) || 'gpt-4o-mini',
          }));
        }
      }

      // Check templates count
      const { count } = await supabase
        .from('whatsapp_templates')
        .select('id', { count: 'exact', head: true });
      
      if (count && count > 0) {
        setData(prev => ({
          ...prev,
          templatesSynced: true,
          templatesCount: count,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const saveCurrentStep = async () => {
    setLoading(true);
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const userId = currentUser.user?.id;

      switch (currentStep) {
        case 1: // WhatsApp
          await Promise.all([
            upsertSetting('whatsapp_access_token', data.whatsappAccessToken, 'integrations', userId),
            upsertSetting('whatsapp_phone_number_id', data.whatsappPhoneNumberId, 'integrations', userId),
            upsertSetting('whatsapp_verify_token', data.whatsappVerifyToken, 'integrations', userId),
          ]);
          break;
        case 2: // AI Provider
          await upsertSetting('openai_api_key', data.openaiApiKey, 'ai', userId);
          break;
        case 3: // ElevenLabs
          if (!data.skipElevenlabs) {
            await Promise.all([
              upsertSetting('elevenlabs_api_key', data.elevenlabsApiKey, 'ai', userId),
              upsertSetting('elevenlabs_voice_id', data.elevenlabsVoiceId, 'ai', userId),
            ]);
          }
          break;
        case 5: // AI Agent
          const agentConfig = {
            agentName: data.agentName,
            companyName: data.companyName,
            communicationTone: data.communicationTone,
            greetingMessage: data.greetingMessage,
            aiProvider: data.aiProvider,
            model: data.aiModel,
          };
          await upsertSetting('ai_agent_config', agentConfig, 'ai', userId);
          break;
      }
      return true;
    } catch (error) {
      console.error('Error saving step:', error);
      toast.error('Erro ao salvar configuração');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const upsertSetting = async (key: string, value: unknown, category: string, userId?: string) => {
    const { error } = await supabase
      .from('system_settings')
      .upsert({
        setting_key: key,
        setting_value: value as any,
        setting_category: category,
        updated_by: userId,
      }, { onConflict: 'setting_key' });

    if (error) throw error;
  };

  const handleNext = async () => {
    // Validate current step
    if (!validateCurrentStep()) return;

    // Save current step data
    const saved = await saveCurrentStep();
    if (!saved && currentStep !== 3 && currentStep !== 4 && currentStep !== 6) return;

    if (currentStep < 7) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      await upsertSetting('onboarding_completed', true, 'system', currentUser.user?.id);
      toast.success('Configuração concluída com sucesso!');
      onComplete();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Erro ao finalizar configuração');
    }
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 1:
        if (!data.whatsappAccessToken || !data.whatsappPhoneNumberId) {
          toast.error('Preencha os campos obrigatórios do WhatsApp');
          return false;
        }
        break;
      case 2:
        if (data.aiProvider === 'openai' && !data.openaiApiKey) {
          toast.error('Informe a API Key do OpenAI');
          return false;
        }
        break;
      case 5:
        if (!data.agentName || !data.companyName) {
          toast.error('Preencha o nome do agente e da empresa');
          return false;
        }
        break;
    }
    return true;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepWhatsApp data={data} updateData={updateData} />;
      case 2:
        return <StepAIProvider data={data} updateData={updateData} />;
      case 3:
        return <StepElevenLabs data={data} updateData={updateData} />;
      case 4:
        return <StepTemplates data={data} updateData={updateData} />;
      case 5:
        return <StepAIAgent data={data} updateData={updateData} />;
      case 6:
        return <StepHealthCheck data={data} results={healthCheckResults} setResults={setHealthCheckResults} />;
      case 7:
        return <StepCompletion data={data} healthResults={healthCheckResults} />;
      default:
        return null;
    }
  };

  const canSkipStep = currentStep === 3; // Only ElevenLabs can be skipped

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 bg-background z-10 border-b">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-semibold">Configuração Inicial do Sistema</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="px-4 pb-4">
            <WizardProgress currentStep={currentStep} steps={steps} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t p-4 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || loading}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <div className="flex gap-2">
            {canSkipStep && (
              <Button
                variant="ghost"
                onClick={() => {
                  updateData({ skipElevenlabs: true });
                  setCurrentStep(prev => prev + 1);
                }}
                disabled={loading}
              >
                Pular
              </Button>
            )}

            {currentStep < 7 ? (
              <Button onClick={handleNext} disabled={loading}>
                {loading ? 'Salvando...' : 'Próximo'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={loading} className="bg-green-600 hover:bg-green-700">
                Concluir Configuração
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
