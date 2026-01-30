import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAIBehaviorConfig } from './useAIBehavior';

export interface AIAgentConfig {
  agent_name: string;
  company_name: string;
  company_description: string;
  services: string[];
  tone: 'formal' | 'casual' | 'friendly' | 'technical';
  limitations: string[];
  faqs: { question: string; answer: string }[];
  custom_instructions: string;
  greeting_message: string;
  fallback_message: string;
  ai_provider: 'lovable' | 'openai';
  ai_model: string;
  max_tokens: number;
  max_history_messages: number;
  // Humanization settings
  humanize_responses: boolean;
  fragment_long_messages: boolean;
  message_delay_ms: number;
  emoji_intensity: 'none' | 'low' | 'medium';
  use_customer_name: boolean;
  // Audio settings
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: 'text_only' | 'audio_only' | 'text_and_audio';
  audio_channel_mirroring: boolean;
  audio_max_chars: number;
  // Business Context
  target_audience: string;
  competitive_advantages: string[];
  company_values: string;
  service_areas: string[];
  // Rapport Techniques
  rapport_enabled: boolean;
  rapport_use_name: boolean;
  rapport_mirror_language: boolean;
  rapport_show_empathy: boolean;
  rapport_validate_emotions: boolean;
  // Mental Triggers
  triggers_enabled: boolean;
  trigger_urgency: boolean;
  trigger_scarcity: boolean;
  trigger_social_proof: boolean;
  trigger_authority: boolean;
  social_proof_text: string;
  authority_text: string;
  // Objections
  objections: { objection: string; response: string }[];
  // Knowledge Base
  knowledge_base_url: string;
  knowledge_base_content: string;
  knowledge_base_last_update: string;
  // SPIN Qualification
  spin_enabled: boolean;
  spin_situation_questions: string[];
  spin_problem_questions: string[];
  spin_implication_questions: string[];
  spin_need_questions: string[];
  escalation_criteria: string[];
  // Schedule Config
  schedule_config: {
    mode: 'always_active' | 'business_hours_only' | 'outside_hours_only' | 'scheduled';
    timezone: string;
    default_hours: {
      start: string;
      end: string;
      days: number[];
    };
    custom_schedule: Record<number, { enabled: boolean; periods: { start: string; end: string }[] }>;
    force_ai_mode: boolean;
    pause_periods: { start: string; end: string; reason?: string }[];
  };
  // Prompt Overrides per department
  prompt_overrides: {
    locacao: string | null;
    vendas: string | null;
    administrativo: string | null;
    geral: string | null;
    empreendimentos: string | null;
  };
}

const defaultConfig: AIAgentConfig = {
  agent_name: 'Assistente Virtual',
  company_name: 'Smolka Imóveis',
  company_description: 'Administradora de imóveis especializada em locação e gestão de propriedades.',
  services: ['Locação de imóveis', 'Gestão de propriedades', 'Administração de condomínios'],
  tone: 'formal',
  limitations: [
    'Não pode agendar visitas ou compromissos',
    'Não tem acesso a valores de aluguéis ou taxas',
    'Não pode negociar condições contratuais',
    'Não pode acessar dados específicos de contratos'
  ],
  faqs: [
    { question: 'Qual o horário de atendimento?', answer: 'Nosso atendimento funciona de segunda a sexta, das 08h às 18h.' },
    { question: 'Como posso alugar um imóvel?', answer: 'Para alugar um imóvel, entre em contato conosco para verificar a disponibilidade e agendar uma visita com nossos atendentes.' }
  ],
  custom_instructions: '',
  greeting_message: 'Olá! Sou o assistente virtual da {company_name}. Como posso ajudá-lo?',
  fallback_message: 'Entendi sua solicitação. Um de nossos atendentes entrará em contato no próximo dia útil para ajudá-lo melhor.',
  ai_provider: 'openai',
  ai_model: 'gpt-4o-mini',
  max_tokens: 500,
  max_history_messages: 5,
  humanize_responses: true,
  fragment_long_messages: true,
  message_delay_ms: 2000,
  emoji_intensity: 'low',
  use_customer_name: true,
  audio_enabled: false,
  audio_voice_id: '',
  audio_voice_name: 'Sarah',
  audio_mode: 'text_and_audio',
  audio_channel_mirroring: true,
  audio_max_chars: 400,
  target_audience: 'Proprietários e inquilinos de imóveis residenciais e comerciais',
  competitive_advantages: ['Atendimento personalizado', 'Transparência nas informações', 'Agilidade nos processos'],
  company_values: 'Ética, transparência e compromisso com a satisfação do cliente.',
  service_areas: ['Florianópolis', 'São José', 'Palhoça'],
  rapport_enabled: true,
  rapport_use_name: true,
  rapport_mirror_language: true,
  rapport_show_empathy: true,
  rapport_validate_emotions: true,
  triggers_enabled: true,
  trigger_urgency: true,
  trigger_scarcity: true,
  trigger_social_proof: true,
  trigger_authority: true,
  social_proof_text: 'Já ajudamos mais de 500 famílias a encontrar o imóvel ideal.',
  authority_text: 'Somos especialistas em administração de imóveis há mais de 20 anos.',
  objections: [
    { objection: 'O valor está muito alto', response: 'Entendo sua preocupação com o valor. Nossos imóveis são cuidadosamente selecionados e oferecem excelente custo-benefício. Posso ajudá-lo a encontrar opções dentro do seu orçamento?' },
    { objection: 'Preciso pensar mais', response: 'Claro, é uma decisão importante! Enquanto isso, posso enviar mais informações sobre o imóvel para você analisar com calma?' },
  ],
  knowledge_base_url: '',
  knowledge_base_content: '',
  knowledge_base_last_update: '',
  spin_enabled: true,
  spin_situation_questions: [
    'Você está buscando um imóvel para morar ou investir?',
    'Qual região você tem interesse?',
    'Quantos quartos você precisa?',
  ],
  spin_problem_questions: [
    'Qual é a sua maior dificuldade em encontrar o imóvel ideal?',
    'O que não funcionou nas suas buscas anteriores?',
  ],
  spin_implication_questions: [
    'Como essa situação está afetando você e sua família?',
    'Quanto tempo você pode esperar para resolver isso?',
  ],
  spin_need_questions: [
    'Se encontrássemos o imóvel perfeito, quando você estaria pronto para fechar?',
    'O que tornaria essa busca um sucesso para você?',
  ],
  escalation_criteria: [
    'Cliente demonstra urgência alta',
    'Valor do imóvel acima de R$ 500.000',
    'Cliente insatisfeito ou reclamação',
    'Solicitação fora do horário comercial que requer ação imediata',
  ],
  schedule_config: {
    mode: 'outside_hours_only',
    timezone: 'America/Sao_Paulo',
    default_hours: {
      start: '08:00',
      end: '18:00',
      days: [1, 2, 3, 4, 5],
    },
    custom_schedule: {
      0: { enabled: false, periods: [] },
      1: { enabled: true, periods: [{ start: '08:00', end: '18:00' }] },
      2: { enabled: true, periods: [{ start: '08:00', end: '18:00' }] },
      3: { enabled: true, periods: [{ start: '08:00', end: '18:00' }] },
      4: { enabled: true, periods: [{ start: '08:00', end: '18:00' }] },
      5: { enabled: true, periods: [{ start: '08:00', end: '18:00' }] },
      6: { enabled: false, periods: [] },
    },
    force_ai_mode: false,
    pause_periods: [],
  },
  prompt_overrides: {
    locacao: null,
    vendas: null,
    administrativo: null,
    geral: null,
    empreendimentos: null,
  },
};

export function useAIUnifiedConfig() {
  const [config, setConfig] = useState<AIAgentConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Also fetch behavior config
  const { data: behaviorConfig, isLoading: behaviorLoading } = useAIBehaviorConfig();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_agent_config')
        .single();

      if (data?.setting_value) {
        const savedConfig = data.setting_value as unknown as AIAgentConfig;
        setConfig({ ...defaultConfig, ...savedConfig });
      }
    } catch (error) {
      console.log('No existing config found, using defaults');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = useCallback((updates: Partial<AIAgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([{
          setting_key: 'ai_agent_config',
          setting_category: 'ai',
          setting_value: JSON.parse(JSON.stringify(config)),
          updated_at: new Date().toISOString()
        }], { onConflict: 'setting_key' });

      if (error) throw error;
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    config,
    behaviorConfig,
    isLoading: isLoading || behaviorLoading,
    isSaving,
    updateConfig,
    saveConfig,
    setConfig,
  };
}
