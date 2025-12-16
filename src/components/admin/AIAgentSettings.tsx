import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Bot, Building2, Save, Plus, Trash2, MessageSquare, AlertTriangle, Sparkles, Eye, HelpCircle, 
  Cpu, Volume2, Smile, Clock, RefreshCw, Loader2, Heart, Target, Shield, Zap, BookOpen, 
  MessageCircle, Users, Globe, TrendingUp, Brain, Lightbulb
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
}

interface Objection {
  objection: string;
  response: string;
}

interface VoiceOption {
  id: string;
  name: string;
  category: string;
  description: string;
  previewUrl?: string;
}

type AIProvider = 'lovable' | 'openai';
type EmojiIntensity = 'none' | 'low' | 'medium';
type AudioMode = 'text_only' | 'audio_only' | 'text_and_audio';

interface AIAgentConfig {
  agent_name: string;
  company_name: string;
  company_description: string;
  services: string[];
  tone: 'formal' | 'casual' | 'friendly' | 'technical';
  limitations: string[];
  faqs: FAQ[];
  custom_instructions: string;
  greeting_message: string;
  fallback_message: string;
  ai_provider: AIProvider;
  ai_model: string;
  max_tokens: number;
  max_history_messages: number;
  // Humanization settings
  humanize_responses: boolean;
  fragment_long_messages: boolean;
  message_delay_ms: number;
  emoji_intensity: EmojiIntensity;
  use_customer_name: boolean;
  // Audio settings
  audio_enabled: boolean;
  audio_voice_id: string;
  audio_voice_name: string;
  audio_mode: AudioMode;
  audio_channel_mirroring: boolean;
  audio_max_chars: number;
  // Business Context (NEW)
  target_audience: string;
  competitive_advantages: string[];
  company_values: string;
  service_areas: string[];
  // Rapport Techniques (NEW)
  rapport_enabled: boolean;
  rapport_use_name: boolean;
  rapport_mirror_language: boolean;
  rapport_show_empathy: boolean;
  rapport_validate_emotions: boolean;
  // Mental Triggers (NEW)
  triggers_enabled: boolean;
  trigger_urgency: boolean;
  trigger_scarcity: boolean;
  trigger_social_proof: boolean;
  trigger_authority: boolean;
  social_proof_text: string;
  authority_text: string;
  // Objections (NEW)
  objections: Objection[];
  // Knowledge Base (NEW)
  knowledge_base_url: string;
  knowledge_base_content: string;
  knowledge_base_last_update: string;
  // SPIN Qualification (NEW)
  spin_enabled: boolean;
  spin_situation_questions: string[];
  spin_problem_questions: string[];
  spin_implication_questions: string[];
  spin_need_questions: string[];
  escalation_criteria: string[];
}

const providerModels: Record<AIProvider, { value: string; label: string; description: string }[]> = {
  lovable: [
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Rápido e econômico (recomendado)' },
    { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Mais capaz, maior custo' },
    { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', description: 'Mais barato e rápido' },
  ],
  openai: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Melhor custo-benefício (recomendado)' },
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Mais capaz, maior custo' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Alta performance' },
  ],
};

const fallbackVoiceOptions: VoiceOption[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', category: 'premade', description: 'Feminina, calorosa' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', category: 'premade', description: 'Feminina, amigável' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', category: 'premade', description: 'Feminina, profissional' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', category: 'premade', description: 'Feminina, conversacional' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', category: 'premade', description: 'Feminina, suave' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', category: 'premade', description: 'Masculina, autoritária' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', category: 'premade', description: 'Masculina, casual' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', category: 'premade', description: 'Masculina, britânica' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', category: 'premade', description: 'Masculina, americana' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', category: 'premade', description: 'Masculina, grave' },
];

const categoryLabels: Record<string, string> = {
  'premade': 'Vozes Pré-definidas',
  'cloned': 'Vozes Clonadas',
  'generated': 'Vozes Geradas',
  'professional': 'Profissionais',
  'other': 'Outras',
};

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
  // Business Context defaults
  target_audience: 'Proprietários e inquilinos de imóveis residenciais e comerciais',
  competitive_advantages: ['Atendimento personalizado', 'Transparência nas informações', 'Agilidade nos processos'],
  company_values: 'Ética, transparência e compromisso com a satisfação do cliente.',
  service_areas: ['Florianópolis', 'São José', 'Palhoça'],
  // Rapport defaults
  rapport_enabled: true,
  rapport_use_name: true,
  rapport_mirror_language: true,
  rapport_show_empathy: true,
  rapport_validate_emotions: true,
  // Trigger defaults
  triggers_enabled: true,
  trigger_urgency: true,
  trigger_scarcity: true,
  trigger_social_proof: true,
  trigger_authority: true,
  social_proof_text: 'Já ajudamos mais de 500 famílias a encontrar o imóvel ideal.',
  authority_text: 'Somos especialistas em administração de imóveis há mais de 20 anos.',
  // Objections defaults
  objections: [
    { objection: 'O valor está muito alto', response: 'Entendo sua preocupação com o valor. Nossos imóveis são cuidadosamente selecionados e oferecem excelente custo-benefício. Posso ajudá-lo a encontrar opções dentro do seu orçamento?' },
    { objection: 'Preciso pensar mais', response: 'Claro, é uma decisão importante! Enquanto isso, posso enviar mais informações sobre o imóvel para você analisar com calma?' },
  ],
  // Knowledge Base defaults
  knowledge_base_url: '',
  knowledge_base_content: '',
  knowledge_base_last_update: '',
  // SPIN defaults
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
};

export function AIAgentSettings() {
  const [config, setConfig] = useState<AIAgentConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newService, setNewService] = useState('');
  const [newLimitation, setNewLimitation] = useState('');
  const [newFaq, setNewFaq] = useState<FAQ>({ question: '', answer: '' });
  const [newAdvantage, setNewAdvantage] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newObjection, setNewObjection] = useState<Objection>({ objection: '', response: '' });
  const [newSpinQuestion, setNewSpinQuestion] = useState('');
  const [newEscalationCriteria, setNewEscalationCriteria] = useState('');
  const [isScrapingKnowledge, setIsScrapingKnowledge] = useState(false);
  
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>(fallbackVoiceOptions);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

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

  const loadVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    try {
      const { data, error } = await supabase.functions.invoke('elevenlabs-list-voices');
      
      if (error) {
        console.error('Error loading voices:', error);
        toast.error('Erro ao carregar vozes. Usando vozes padrão.');
        return;
      }
      
      if (data?.success && data.voices?.length > 0) {
        setVoiceOptions(data.voices);
        setVoicesLoaded(true);
        toast.success(`${data.voices.length} vozes carregadas da sua conta ElevenLabs`);
      } else {
        toast.error('Nenhuma voz encontrada na conta ElevenLabs');
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      toast.error('Erro ao carregar vozes');
    } finally {
      setIsLoadingVoices(false);
    }
  }, []);

  const scrapeKnowledgeBase = async () => {
    if (!config.knowledge_base_url) {
      toast.error('Insira a URL do site para extrair conhecimento');
      return;
    }

    setIsScrapingKnowledge(true);
    try {
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape-knowledge', {
        body: { url: config.knowledge_base_url }
      });

      if (error) {
        console.error('Error scraping:', error);
        toast.error('Erro ao extrair conhecimento do site');
        return;
      }

      if (data?.success && data.content) {
        setConfig(prev => ({
          ...prev,
          knowledge_base_content: data.content,
          knowledge_base_last_update: new Date().toISOString(),
        }));
        toast.success('Base de conhecimento atualizada com sucesso!');
      } else {
        toast.error(data?.error || 'Erro ao extrair conteúdo');
      }
    } catch (error) {
      console.error('Error scraping:', error);
      toast.error('Erro ao extrair conhecimento');
    } finally {
      setIsScrapingKnowledge(false);
    }
  };

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
      toast.success('Configurações do agente IA salvas!');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions for adding/removing items
  const addService = () => {
    if (newService.trim()) {
      setConfig(prev => ({ ...prev, services: [...prev.services, newService.trim()] }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setConfig(prev => ({ ...prev, services: prev.services.filter((_, i) => i !== index) }));
  };

  const addLimitation = () => {
    if (newLimitation.trim()) {
      setConfig(prev => ({ ...prev, limitations: [...prev.limitations, newLimitation.trim()] }));
      setNewLimitation('');
    }
  };

  const removeLimitation = (index: number) => {
    setConfig(prev => ({ ...prev, limitations: prev.limitations.filter((_, i) => i !== index) }));
  };

  const addFaq = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      setConfig(prev => ({ ...prev, faqs: [...prev.faqs, { ...newFaq }] }));
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    setConfig(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }));
  };

  const addAdvantage = () => {
    if (newAdvantage.trim()) {
      setConfig(prev => ({ ...prev, competitive_advantages: [...prev.competitive_advantages, newAdvantage.trim()] }));
      setNewAdvantage('');
    }
  };

  const removeAdvantage = (index: number) => {
    setConfig(prev => ({ ...prev, competitive_advantages: prev.competitive_advantages.filter((_, i) => i !== index) }));
  };

  const addArea = () => {
    if (newArea.trim()) {
      setConfig(prev => ({ ...prev, service_areas: [...prev.service_areas, newArea.trim()] }));
      setNewArea('');
    }
  };

  const removeArea = (index: number) => {
    setConfig(prev => ({ ...prev, service_areas: prev.service_areas.filter((_, i) => i !== index) }));
  };

  const addObjection = () => {
    if (newObjection.objection.trim() && newObjection.response.trim()) {
      setConfig(prev => ({ ...prev, objections: [...prev.objections, { ...newObjection }] }));
      setNewObjection({ objection: '', response: '' });
    }
  };

  const removeObjection = (index: number) => {
    setConfig(prev => ({ ...prev, objections: prev.objections.filter((_, i) => i !== index) }));
  };

  const addSpinQuestion = (type: 'situation' | 'problem' | 'implication' | 'need') => {
    if (newSpinQuestion.trim()) {
      const key = `spin_${type}_questions` as keyof AIAgentConfig;
      setConfig(prev => ({
        ...prev,
        [key]: [...(prev[key] as string[]), newSpinQuestion.trim()]
      }));
      setNewSpinQuestion('');
    }
  };

  const removeSpinQuestion = (type: 'situation' | 'problem' | 'implication' | 'need', index: number) => {
    const key = `spin_${type}_questions` as keyof AIAgentConfig;
    setConfig(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).filter((_, i) => i !== index)
    }));
  };

  const addEscalationCriteria = () => {
    if (newEscalationCriteria.trim()) {
      setConfig(prev => ({ ...prev, escalation_criteria: [...prev.escalation_criteria, newEscalationCriteria.trim()] }));
      setNewEscalationCriteria('');
    }
  };

  const removeEscalationCriteria = (index: number) => {
    setConfig(prev => ({ ...prev, escalation_criteria: prev.escalation_criteria.filter((_, i) => i !== index) }));
  };

  const generatePromptPreview = () => {
    const toneDescriptions = {
      formal: 'Formal e profissional',
      casual: 'Casual e descontraído',
      friendly: 'Amigável e acolhedor',
      technical: 'Técnico e preciso'
    };

    let preview = `Você é ${config.agent_name} da ${config.company_name}.

SOBRE A EMPRESA:
${config.company_description}

PÚBLICO-ALVO: ${config.target_audience}

DIFERENCIAIS COMPETITIVOS:
${config.competitive_advantages.map(a => `• ${a}`).join('\n')}

VALORES DA EMPRESA:
${config.company_values}

REGIÕES DE ATUAÇÃO:
${config.service_areas.join(', ')}

SERVIÇOS OFERECIDOS:
${config.services.map(s => `• ${s}`).join('\n')}

TOM DE COMUNICAÇÃO: ${toneDescriptions[config.tone]}`;

    if (config.rapport_enabled) {
      preview += `\n\nTÉCNICAS DE RAPPORT:
${config.rapport_use_name ? '• Use o nome do cliente naturalmente durante a conversa' : ''}
${config.rapport_mirror_language ? '• Espelhe o estilo de comunicação do cliente' : ''}
${config.rapport_show_empathy ? '• Demonstre empatia e interesse genuíno' : ''}
${config.rapport_validate_emotions ? '• Valide emoções e preocupações do cliente' : ''}`;
    }

    if (config.triggers_enabled) {
      preview += `\n\nGATILHOS DE CONVERSÃO:
${config.trigger_urgency ? '• Crie senso de urgência quando apropriado' : ''}
${config.trigger_scarcity ? '• Mencione disponibilidade limitada quando relevante' : ''}
${config.trigger_social_proof ? `• Prova social: "${config.social_proof_text}"` : ''}
${config.trigger_authority ? `• Autoridade: "${config.authority_text}"` : ''}`;
    }

    if (config.objections.length > 0) {
      preview += `\n\nTRATAMENTO DE OBJEÇÕES:
${config.objections.map(o => `Objeção: "${o.objection}"\nResposta: "${o.response}"`).join('\n\n')}`;
    }

    if (config.spin_enabled) {
      preview += `\n\nQUALIFICAÇÃO SPIN:
Use estas perguntas para qualificar o lead:
- Situação: ${config.spin_situation_questions.slice(0, 2).join('; ')}
- Problema: ${config.spin_problem_questions.slice(0, 1).join('; ')}
- Implicação: ${config.spin_implication_questions.slice(0, 1).join('; ')}
- Necessidade: ${config.spin_need_questions.slice(0, 1).join('; ')}`;
    }

    if (config.knowledge_base_content) {
      preview += `\n\nBASE DE CONHECIMENTO:
${config.knowledge_base_content.substring(0, 500)}...`;
    }

    preview += `\n\nLIMITAÇÕES (sempre encaminhe ao atendente humano):
${config.limitations.map(l => `• ${l}`).join('\n')}

${config.faqs.length > 0 ? `PERGUNTAS FREQUENTES:
${config.faqs.map(faq => `P: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}` : ''}

${config.custom_instructions ? `INSTRUÇÕES ESPECIAIS:\n${config.custom_instructions}` : ''}`;

    return preview;
  };

  const toneOptions = [
    { value: 'formal', label: 'Formal', description: 'Profissional e respeitoso' },
    { value: 'casual', label: 'Casual', description: 'Descontraído mas educado' },
    { value: 'friendly', label: 'Amigável', description: 'Acolhedor e empático' },
    { value: 'technical', label: 'Técnico', description: 'Preciso e objetivo' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const handleProviderChange = (provider: AIProvider) => {
    const defaultModel = providerModels[provider][0].value;
    setConfig(prev => ({ ...prev, ai_provider: provider, ai_model: defaultModel }));
  };

  const handleVoiceChange = (voiceIdOrName: string) => {
    const voice = voiceOptions.find(v => v.id === voiceIdOrName) || 
                  voiceOptions.find(v => v.name === voiceIdOrName);
    if (voice) {
      setConfig(prev => ({
        ...prev,
        audio_voice_name: voice.name,
        audio_voice_id: voice.id
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Provider Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <CardTitle>Provedor de IA</CardTitle>
          </div>
          <CardDescription>Escolha o provedor e modelo de IA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select value={config.ai_provider} onValueChange={(value) => handleProviderChange(value as AIProvider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (créditos próprios)</SelectItem>
                  <SelectItem value="lovable">Lovable AI (Google Gemini)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select value={config.ai_model} onValueChange={(value) => setConfig(prev => ({ ...prev, ai_model: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {providerModels[config.ai_provider].map(model => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limite de Tokens</Label>
              <Input
                type="number"
                value={config.max_tokens}
                onChange={(e) => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 500 }))}
                min={100}
                max={2000}
              />
            </div>
            <div className="space-y-2">
              <Label>Histórico de Mensagens</Label>
              <Input
                type="number"
                value={config.max_history_messages}
                onChange={(e) => setConfig(prev => ({ ...prev, max_history_messages: parseInt(e.target.value) || 5 }))}
                min={1}
                max={20}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Context - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Contexto de Negócio</CardTitle>
          </div>
          <CardDescription>Informações estratégicas para personalizar o atendimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Público-Alvo</Label>
            <Textarea
              value={config.target_audience}
              onChange={(e) => setConfig(prev => ({ ...prev, target_audience: e.target.value }))}
              placeholder="Descreva seu público-alvo..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Diferenciais Competitivos</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {config.competitive_advantages.map((adv, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {adv}
                  <button onClick={() => removeAdvantage(index)} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newAdvantage}
                onChange={(e) => setNewAdvantage(e.target.value)}
                placeholder="Adicionar diferencial..."
                onKeyPress={(e) => e.key === 'Enter' && addAdvantage()}
              />
              <Button variant="outline" onClick={addAdvantage}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valores da Empresa</Label>
            <Textarea
              value={config.company_values}
              onChange={(e) => setConfig(prev => ({ ...prev, company_values: e.target.value }))}
              placeholder="Missão, visão e valores..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Regiões de Atuação</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {config.service_areas.map((area, index) => (
                <Badge key={index} variant="outline" className="gap-1">
                  {area}
                  <button onClick={() => removeArea(index)} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="Adicionar região..."
                onKeyPress={(e) => e.key === 'Enter' && addArea()}
              />
              <Button variant="outline" onClick={addArea}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rapport Techniques - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            <CardTitle>Técnicas de Rapport</CardTitle>
          </div>
          <CardDescription>Construa conexão e confiança com o cliente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Rapport</Label>
              <p className="text-sm text-muted-foreground">Habilita técnicas de conexão emocional</p>
            </div>
            <Switch
              checked={config.rapport_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, rapport_enabled: checked }))}
            />
          </div>

          {config.rapport_enabled && (
            <>
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Usar Nome do Cliente</Label>
                    <p className="text-xs text-muted-foreground">Personaliza usando o nome naturalmente</p>
                  </div>
                  <Switch
                    checked={config.rapport_use_name}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, rapport_use_name: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Espelhamento Linguístico</Label>
                    <p className="text-xs text-muted-foreground">Adapta o estilo ao do cliente</p>
                  </div>
                  <Switch
                    checked={config.rapport_mirror_language}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, rapport_mirror_language: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2"><Heart className="h-4 w-4" /> Demonstrar Empatia</Label>
                    <p className="text-xs text-muted-foreground">Mostra interesse genuíno</p>
                  </div>
                  <Switch
                    checked={config.rapport_show_empathy}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, rapport_show_empathy: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2"><Shield className="h-4 w-4" /> Validar Emoções</Label>
                    <p className="text-xs text-muted-foreground">Reconhece sentimentos e preocupações</p>
                  </div>
                  <Switch
                    checked={config.rapport_validate_emotions}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, rapport_validate_emotions: checked }))}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mental Triggers - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle>Gatilhos Mentais</CardTitle>
          </div>
          <CardDescription>Técnicas de persuasão para aumentar conversão</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar Gatilhos</Label>
              <p className="text-sm text-muted-foreground">Usa técnicas de persuasão naturalmente</p>
            </div>
            <Switch
              checked={config.triggers_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, triggers_enabled: checked }))}
            />
          </div>

          {config.triggers_enabled && (
            <>
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label>Urgência</Label>
                  <Switch
                    checked={config.trigger_urgency}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, trigger_urgency: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Escassez</Label>
                  <Switch
                    checked={config.trigger_scarcity}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, trigger_scarcity: checked }))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Prova Social</Label>
                    <Switch
                      checked={config.trigger_social_proof}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, trigger_social_proof: checked }))}
                    />
                  </div>
                  {config.trigger_social_proof && (
                    <Input
                      value={config.social_proof_text}
                      onChange={(e) => setConfig(prev => ({ ...prev, social_proof_text: e.target.value }))}
                      placeholder="Ex: Já ajudamos mais de 500 famílias..."
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Autoridade</Label>
                    <Switch
                      checked={config.trigger_authority}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, trigger_authority: checked }))}
                    />
                  </div>
                  {config.trigger_authority && (
                    <Input
                      value={config.authority_text}
                      onChange={(e) => setConfig(prev => ({ ...prev, authority_text: e.target.value }))}
                      placeholder="Ex: Especialistas há mais de 20 anos..."
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Objections - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <CardTitle>Tratamento de Objeções</CardTitle>
          </div>
          <CardDescription>Respostas prontas para objeções comuns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="multiple" className="w-full">
            {config.objections.map((obj, index) => (
              <AccordionItem key={index} value={`obj-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <span className="text-sm">"{obj.objection}"</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 space-y-2">
                    <p className="text-sm text-muted-foreground">{obj.response}</p>
                    <Button variant="ghost" size="sm" onClick={() => removeObjection(index)}>
                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                      Remover
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <Separator />
          
          <div className="space-y-3">
            <Label>Adicionar Nova Objeção</Label>
            <Input
              value={newObjection.objection}
              onChange={(e) => setNewObjection(prev => ({ ...prev, objection: e.target.value }))}
              placeholder="Objeção do cliente..."
            />
            <Textarea
              value={newObjection.response}
              onChange={(e) => setNewObjection(prev => ({ ...prev, response: e.target.value }))}
              placeholder="Resposta sugerida..."
              rows={2}
            />
            <Button variant="outline" onClick={addObjection} disabled={!newObjection.objection || !newObjection.response}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Objeção
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-500" />
            <CardTitle>Base de Conhecimento</CardTitle>
          </div>
          <CardDescription>Extraia informações do seu site automaticamente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Site</Label>
            <div className="flex gap-2">
              <Input
                value={config.knowledge_base_url}
                onChange={(e) => setConfig(prev => ({ ...prev, knowledge_base_url: e.target.value }))}
                placeholder="https://smolkaimoveis.com.br"
              />
              <Button 
                variant="outline" 
                onClick={scrapeKnowledgeBase}
                disabled={isScrapingKnowledge || !config.knowledge_base_url}
              >
                {isScrapingKnowledge ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extraindo...
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2" />
                    Extrair
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Usa Firecrawl para extrair conteúdo do site automaticamente
            </p>
          </div>

          {config.knowledge_base_content && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo Extraído</Label>
                {config.knowledge_base_last_update && (
                  <span className="text-xs text-muted-foreground">
                    Atualizado: {new Date(config.knowledge_base_last_update).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
              <Textarea
                value={config.knowledge_base_content}
                onChange={(e) => setConfig(prev => ({ ...prev, knowledge_base_content: e.target.value }))}
                rows={6}
                className="font-mono text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* SPIN Qualification - NEW */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            <CardTitle>Qualificação SPIN</CardTitle>
          </div>
          <CardDescription>Metodologia SPIN Selling para qualificação de leads</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ativar SPIN Selling</Label>
              <p className="text-sm text-muted-foreground">Usa perguntas estruturadas para qualificar</p>
            </div>
            <Switch
              checked={config.spin_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, spin_enabled: checked }))}
            />
          </div>

          {config.spin_enabled && (
            <>
              <Separator />
              
              <Accordion type="single" collapsible className="w-full">
                {/* Situation */}
                <AccordionItem value="situation">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600">S</Badge>
                      <span>Situação ({config.spin_situation_questions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">Perguntas sobre o contexto atual do cliente</p>
                    {config.spin_situation_questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="flex-1 text-sm">{q}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeSpinQuestion('situation', i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newSpinQuestion}
                        onChange={(e) => setNewSpinQuestion(e.target.value)}
                        placeholder="Nova pergunta de situação..."
                        onKeyPress={(e) => e.key === 'Enter' && addSpinQuestion('situation')}
                      />
                      <Button variant="outline" onClick={() => addSpinQuestion('situation')}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Problem */}
                <AccordionItem value="problem">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-red-500/10 text-red-600">P</Badge>
                      <span>Problema ({config.spin_problem_questions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">Perguntas sobre dores e dificuldades</p>
                    {config.spin_problem_questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="flex-1 text-sm">{q}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeSpinQuestion('problem', i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newSpinQuestion}
                        onChange={(e) => setNewSpinQuestion(e.target.value)}
                        placeholder="Nova pergunta de problema..."
                        onKeyPress={(e) => e.key === 'Enter' && addSpinQuestion('problem')}
                      />
                      <Button variant="outline" onClick={() => addSpinQuestion('problem')}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Implication */}
                <AccordionItem value="implication">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600">I</Badge>
                      <span>Implicação ({config.spin_implication_questions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">Perguntas sobre consequências de não resolver</p>
                    {config.spin_implication_questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="flex-1 text-sm">{q}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeSpinQuestion('implication', i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newSpinQuestion}
                        onChange={(e) => setNewSpinQuestion(e.target.value)}
                        placeholder="Nova pergunta de implicação..."
                        onKeyPress={(e) => e.key === 'Enter' && addSpinQuestion('implication')}
                      />
                      <Button variant="outline" onClick={() => addSpinQuestion('implication')}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Need-Payoff */}
                <AccordionItem value="need">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-600">N</Badge>
                      <span>Necessidade ({config.spin_need_questions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">Perguntas que guiam para a solução</p>
                    {config.spin_need_questions.map((q, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                        <span className="flex-1 text-sm">{q}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeSpinQuestion('need', i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        value={newSpinQuestion}
                        onChange={(e) => setNewSpinQuestion(e.target.value)}
                        placeholder="Nova pergunta de necessidade..."
                        onKeyPress={(e) => e.key === 'Enter' && addSpinQuestion('need')}
                      />
                      <Button variant="outline" onClick={() => addSpinQuestion('need')}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Critérios de Escalonamento
                </Label>
                <p className="text-xs text-muted-foreground">Quando encaminhar para atendimento humano</p>
                {config.escalation_criteria.map((criteria, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-amber-500/10 rounded">
                    <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    <span className="flex-1 text-sm">{criteria}</span>
                    <Button variant="ghost" size="sm" onClick={() => removeEscalationCriteria(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newEscalationCriteria}
                    onChange={(e) => setNewEscalationCriteria(e.target.value)}
                    placeholder="Adicionar critério..."
                    onKeyPress={(e) => e.key === 'Enter' && addEscalationCriteria()}
                  />
                  <Button variant="outline" onClick={addEscalationCriteria}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Humanization Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-primary" />
            <CardTitle>Humanização das Respostas</CardTitle>
          </div>
          <CardDescription>Configure para parecer mais natural</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Respostas Humanizadas</Label>
              <p className="text-sm text-muted-foreground">Linguagem mais natural</p>
            </div>
            <Switch
              checked={config.humanize_responses}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, humanize_responses: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Fragmentar Mensagens</Label>
              <p className="text-sm text-muted-foreground">Divide em mensagens menores</p>
            </div>
            <Switch
              checked={config.fragment_long_messages}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, fragment_long_messages: checked }))}
            />
          </div>

          {config.fragment_long_messages && (
            <div className="space-y-2 pl-4 border-l-2 border-primary/20">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Delay: {(config.message_delay_ms / 1000).toFixed(1)}s
              </Label>
              <Slider
                value={[config.message_delay_ms]}
                onValueChange={([value]) => setConfig(prev => ({ ...prev, message_delay_ms: value }))}
                min={1000}
                max={5000}
                step={500}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Intensidade de Emojis</Label>
            <Select
              value={config.emoji_intensity}
              onValueChange={(value) => setConfig(prev => ({ ...prev, emoji_intensity: value as EmojiIntensity }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="low">Baixa (1-2)</SelectItem>
                <SelectItem value="medium">Média (2-3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle>Respostas por Áudio</CardTitle>
          </div>
          <CardDescription>ElevenLabs para mensagens de voz</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label>Habilitar Áudio</Label>
            <Switch
              checked={config.audio_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, audio_enabled: checked }))}
            />
          </div>

          {config.audio_enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Voz do Agente</Label>
                  <Button variant="outline" size="sm" onClick={loadVoices} disabled={isLoadingVoices}>
                    {isLoadingVoices ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="ml-2">{voicesLoaded ? 'Recarregar' : 'Carregar'}</span>
                  </Button>
                </div>
                
                <Select value={config.audio_voice_id || config.audio_voice_name} onValueChange={handleVoiceChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma voz" /></SelectTrigger>
                  <SelectContent className="max-h-80">
                    {Object.entries(
                      voiceOptions.reduce((groups, voice) => {
                        const category = voice.category || 'other';
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(voice);
                        return groups;
                      }, {} as Record<string, VoiceOption[]>)
                    ).map(([category, voices]) => (
                      <div key={category}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {categoryLabels[category] || category}
                        </div>
                        {voices.map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Espelhar Canal do Cliente</Label>
                    <p className="text-sm text-muted-foreground">Responde no mesmo formato que o cliente usou (texto → texto, áudio → áudio)</p>
                  </div>
                  <Switch
                    checked={config.audio_channel_mirroring}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, audio_channel_mirroring: checked }))}
                  />
                </div>

                {config.audio_channel_mirroring && (
                  <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                    <Label>Máximo de caracteres para áudio: {config.audio_max_chars}</Label>
                    <p className="text-xs text-muted-foreground">Áudios são mais longos que textos fragmentados</p>
                    <Slider
                      value={[config.audio_max_chars]}
                      onValueChange={([value]) => setConfig(prev => ({ ...prev, audio_max_chars: value }))}
                      min={200}
                      max={800}
                      step={50}
                    />
                  </div>
                )}

                {!config.audio_channel_mirroring && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Modo de Áudio Fixo</Label>
                      <Select
                        value={config.audio_mode}
                        onValueChange={(value) => setConfig(prev => ({ ...prev, audio_mode: value as AudioMode }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text_and_audio">Texto + Áudio</SelectItem>
                          <SelectItem value="audio_only">Apenas Áudio</SelectItem>
                          <SelectItem value="text_only">Apenas Texto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Identidade do Agente</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Agente</Label>
              <Input
                value={config.agent_name}
                onChange={(e) => setConfig(prev => ({ ...prev, agent_name: e.target.value }))}
                placeholder="Assistente Virtual"
              />
            </div>
            <div className="space-y-2">
              <Label>Tom de Comunicação</Label>
              <Select
                value={config.tone}
                onValueChange={(value) => setConfig(prev => ({ ...prev, tone: value as AIAgentConfig['tone'] }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {toneOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Informações da Empresa</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input
              value={config.company_name}
              onChange={(e) => setConfig(prev => ({ ...prev, company_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição da Empresa</Label>
            <Textarea
              value={config.company_description}
              onChange={(e) => setConfig(prev => ({ ...prev, company_description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label>Serviços Oferecidos</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {config.services.map((service, index) => (
                <Badge key={index} variant="secondary" className="gap-1">
                  {service}
                  <button onClick={() => removeService(index)} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Adicionar serviço..."
                onKeyPress={(e) => e.key === 'Enter' && addService()}
              />
              <Button variant="outline" onClick={addService}><Plus className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle>Limitações da IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.limitations.map((limitation, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <span className="flex-1 text-sm">{limitation}</span>
              <Button variant="ghost" size="sm" onClick={() => removeLimitation(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newLimitation}
              onChange={(e) => setNewLimitation(e.target.value)}
              placeholder="Adicionar limitação..."
              onKeyPress={(e) => e.key === 'Enter' && addLimitation()}
            />
            <Button variant="outline" onClick={addLimitation}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle>Perguntas Frequentes</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="multiple" className="w-full">
            {config.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <span className="text-sm text-left">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-4 space-y-2">
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    <Button variant="ghost" size="sm" onClick={() => removeFaq(index)}>
                      <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                      Remover
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <Separator />
          
          <div className="space-y-3">
            <Label>Adicionar Nova FAQ</Label>
            <Input
              value={newFaq.question}
              onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Pergunta..."
            />
            <Textarea
              value={newFaq.answer}
              onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="Resposta..."
              rows={2}
            />
            <Button variant="outline" onClick={addFaq} disabled={!newFaq.question || !newFaq.answer}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar FAQ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Mensagens Padrão</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Mensagem de Saudação</Label>
            <Textarea
              value={config.greeting_message}
              onChange={(e) => setConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem de Fallback</Label>
            <Textarea
              value={config.fallback_message}
              onChange={(e) => setConfig(prev => ({ ...prev, fallback_message: e.target.value }))}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Instruções Especiais</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.custom_instructions}
            onChange={(e) => setConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
            placeholder="Instruções adicionais para o agente..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Preview do Prompt</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {generatePromptPreview()}
            </pre>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving} size="lg">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
