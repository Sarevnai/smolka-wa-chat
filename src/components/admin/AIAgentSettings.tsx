import { useState, useEffect } from 'react';
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
import { Bot, Building2, Save, Plus, Trash2, MessageSquare, AlertTriangle, Sparkles, Eye, HelpCircle, Cpu, Volume2, Smile, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
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

const voiceOptions = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Feminina, calorosa' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Feminina, amigável' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', description: 'Feminina, profissional' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Feminina, conversacional' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Feminina, suave' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Masculina, autoritária' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Masculina, casual' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', description: 'Masculina, britânica' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Masculina, americana' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Masculina, grave' },
];

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
  // Humanization defaults
  humanize_responses: true,
  fragment_long_messages: true,
  message_delay_ms: 2000,
  emoji_intensity: 'low',
  use_customer_name: true,
  // Audio defaults
  audio_enabled: false,
  audio_voice_id: '',
  audio_voice_name: 'Sarah',
  audio_mode: 'text_and_audio',
};

export function AIAgentSettings() {
  const [config, setConfig] = useState<AIAgentConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newService, setNewService] = useState('');
  const [newLimitation, setNewLimitation] = useState('');
  const [newFaq, setNewFaq] = useState<FAQ>({ question: '', answer: '' });

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

  const addService = () => {
    if (newService.trim()) {
      setConfig(prev => ({
        ...prev,
        services: [...prev.services, newService.trim()]
      }));
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    setConfig(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }));
  };

  const addLimitation = () => {
    if (newLimitation.trim()) {
      setConfig(prev => ({
        ...prev,
        limitations: [...prev.limitations, newLimitation.trim()]
      }));
      setNewLimitation('');
    }
  };

  const removeLimitation = (index: number) => {
    setConfig(prev => ({
      ...prev,
      limitations: prev.limitations.filter((_, i) => i !== index)
    }));
  };

  const addFaq = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      setConfig(prev => ({
        ...prev,
        faqs: [...prev.faqs, { ...newFaq }]
      }));
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    setConfig(prev => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index)
    }));
  };

  const generatePromptPreview = () => {
    const toneDescriptions = {
      formal: 'Formal e profissional',
      casual: 'Casual e descontraído',
      friendly: 'Amigável e acolhedor',
      technical: 'Técnico e preciso'
    };

    return `Você é ${config.agent_name} da ${config.company_name}.

SOBRE A EMPRESA:
${config.company_description}

SERVIÇOS OFERECIDOS:
${config.services.map(s => `• ${s}`).join('\n')}

TOM DE COMUNICAÇÃO: ${toneDescriptions[config.tone]}

LIMITAÇÕES (sempre encaminhe ao atendente humano):
${config.limitations.map(l => `• ${l}`).join('\n')}

${config.faqs.length > 0 ? `PERGUNTAS FREQUENTES:
${config.faqs.map(faq => `P: ${faq.question}\nR: ${faq.answer}`).join('\n\n')}` : ''}

${config.custom_instructions ? `INSTRUÇÕES ESPECIAIS:\n${config.custom_instructions}` : ''}

MENSAGEM DE SAUDAÇÃO:
${config.greeting_message.replace('{company_name}', config.company_name)}

MENSAGEM DE FALLBACK:
${config.fallback_message}`;
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

  const handleVoiceChange = (voiceName: string) => {
    const voice = voiceOptions.find(v => v.name === voiceName);
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
          <CardDescription>
            Escolha o provedor e modelo de IA para o agente virtual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <Select
                value={config.ai_provider}
                onValueChange={(value) => handleProviderChange(value as AIProvider)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">
                    <div className="flex flex-col">
                      <span>OpenAI</span>
                      <span className="text-xs text-muted-foreground">Usa sua chave API (créditos próprios)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lovable">
                    <div className="flex flex-col">
                      <span>Lovable AI</span>
                      <span className="text-xs text-muted-foreground">Google Gemini (créditos Lovable)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select
                value={config.ai_model}
                onValueChange={(value) => setConfig(prev => ({ ...prev, ai_model: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
              <Label htmlFor="max-tokens">Limite de Tokens (resposta)</Label>
              <Input
                id="max-tokens"
                type="number"
                value={config.max_tokens}
                onChange={(e) => setConfig(prev => ({ ...prev, max_tokens: parseInt(e.target.value) || 500 }))}
                min={100}
                max={2000}
              />
              <p className="text-xs text-muted-foreground">Controla o tamanho máximo da resposta (~4 chars/token)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-history">Histórico de Mensagens</Label>
              <Input
                id="max-history"
                type="number"
                value={config.max_history_messages}
                onChange={(e) => setConfig(prev => ({ ...prev, max_history_messages: parseInt(e.target.value) || 5 }))}
                min={1}
                max={20}
              />
              <p className="text-xs text-muted-foreground">Quantidade de mensagens anteriores para contexto</p>
            </div>
          </div>

          {config.ai_provider === 'openai' && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                <strong>Nota:</strong> Usando OpenAI, os custos serão cobrados diretamente na sua conta OpenAI.
                Monitore o uso em <a href="https://platform.openai.com/usage" target="_blank" rel="noopener" className="underline">platform.openai.com/usage</a>
              </p>
            </div>
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
          <CardDescription>
            Configure o agente para parecer mais humano e natural nas conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Respostas Humanizadas</Label>
              <p className="text-sm text-muted-foreground">Usa linguagem mais natural com variações e interjeições</p>
            </div>
            <Switch
              checked={config.humanize_responses}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, humanize_responses: checked }))}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Fragmentar Mensagens Longas</Label>
              <p className="text-sm text-muted-foreground">Divide respostas em várias mensagens menores (simula digitação)</p>
            </div>
            <Switch
              checked={config.fragment_long_messages}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, fragment_long_messages: checked }))}
            />
          </div>

          {config.fragment_long_messages && (
            <div className="space-y-3 pl-4 border-l-2 border-primary/20">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Delay entre mensagens: {(config.message_delay_ms / 1000).toFixed(1)}s
                  </Label>
                </div>
                <Slider
                  value={[config.message_delay_ms]}
                  onValueChange={([value]) => setConfig(prev => ({ ...prev, message_delay_ms: value }))}
                  min={1000}
                  max={5000}
                  step={500}
                />
                <p className="text-xs text-muted-foreground">Tempo de espera entre fragmentos (simula tempo de digitação)</p>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-2">
            <Label>Intensidade de Emojis</Label>
            <Select
              value={config.emoji_intensity}
              onValueChange={(value) => setConfig(prev => ({ ...prev, emoji_intensity: value as EmojiIntensity }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum emoji</SelectItem>
                <SelectItem value="low">Baixa (1-2 por mensagem)</SelectItem>
                <SelectItem value="medium">Média (2-3 por mensagem)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Usar Nome do Cliente</Label>
              <p className="text-sm text-muted-foreground">Personaliza respostas usando o nome do contato</p>
            </div>
            <Switch
              checked={config.use_customer_name}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, use_customer_name: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Audio Settings (ElevenLabs) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle>Respostas por Áudio</CardTitle>
          </div>
          <CardDescription>
            Configure o agente para responder por áudio usando ElevenLabs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar Respostas por Áudio</Label>
              <p className="text-sm text-muted-foreground">Envia mensagens de voz além de texto</p>
            </div>
            <Switch
              checked={config.audio_enabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, audio_enabled: checked }))}
            />
          </div>

          {config.audio_enabled && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Voz do Agente</Label>
                  <Select
                    value={config.audio_voice_name}
                    onValueChange={handleVoiceChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {voiceOptions.map(voice => (
                        <SelectItem key={voice.id} value={voice.name}>
                          <div className="flex flex-col">
                            <span>{voice.name}</span>
                            <span className="text-xs text-muted-foreground">{voice.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modo de Envio</Label>
                  <Select
                    value={config.audio_mode}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, audio_mode: value as AudioMode }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text_and_audio">
                        <div className="flex flex-col">
                          <span>Texto + Áudio</span>
                          <span className="text-xs text-muted-foreground">Envia ambos (recomendado)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="audio_only">
                        <div className="flex flex-col">
                          <span>Apenas Áudio</span>
                          <span className="text-xs text-muted-foreground">Só envia mensagem de voz</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="text_only">
                        <div className="flex flex-col">
                          <span>Apenas Texto</span>
                          <span className="text-xs text-muted-foreground">Desativa áudio temporariamente</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm">
                    <strong>Powered by ElevenLabs</strong> - As vozes são geradas usando inteligência artificial de síntese de voz de alta qualidade.
                  </p>
                </div>
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
          <CardDescription>
            Configure o nome e personalidade do seu assistente virtual
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nome do Agente</Label>
              <Input
                id="agent-name"
                value={config.agent_name}
                onChange={(e) => setConfig(prev => ({ ...prev, agent_name: e.target.value }))}
                placeholder="Assistente Virtual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Tom de Comunicação</Label>
              <Select
                value={config.tone}
                onValueChange={(value) => setConfig(prev => ({ ...prev, tone: value as AIAgentConfig['tone'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
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
          <CardDescription>
            Dados sobre o negócio que a IA usará nas conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input
              id="company-name"
              value={config.company_name}
              onChange={(e) => setConfig(prev => ({ ...prev, company_name: e.target.value }))}
              placeholder="Nome da sua empresa"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-description">Descrição da Empresa</Label>
            <Textarea
              id="company-description"
              value={config.company_description}
              onChange={(e) => setConfig(prev => ({ ...prev, company_description: e.target.value }))}
              placeholder="Descreva o que sua empresa faz, seus diferenciais..."
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
              <Button variant="outline" onClick={addService}>
                <Plus className="h-4 w-4" />
              </Button>
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
          <CardDescription>
            Defina o que a IA NÃO pode fazer (sempre encaminhará ao atendente)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {config.limitations.map((limitation, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <span className="flex-1 text-sm">{limitation}</span>
                <Button variant="ghost" size="sm" onClick={() => removeLimitation(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newLimitation}
              onChange={(e) => setNewLimitation(e.target.value)}
              placeholder="Adicionar limitação..."
              onKeyPress={(e) => e.key === 'Enter' && addLimitation()}
            />
            <Button variant="outline" onClick={addLimitation}>
              <Plus className="h-4 w-4" />
            </Button>
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
          <CardDescription>
            Perguntas e respostas que a IA pode usar como referência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="multiple" className="w-full">
            {config.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <MessageSquare className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-6 space-y-2">
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
          <CardDescription>
            Mensagens de saudação e fallback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting">Mensagem de Saudação</Label>
            <Textarea
              id="greeting"
              value={config.greeting_message}
              onChange={(e) => setConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
              placeholder="Olá! Como posso ajudar?"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Use {'{company_name}'} para inserir o nome da empresa</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallback">Mensagem de Fallback</Label>
            <Textarea
              id="fallback"
              value={config.fallback_message}
              onChange={(e) => setConfig(prev => ({ ...prev, fallback_message: e.target.value }))}
              placeholder="Um atendente entrará em contato..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Usada quando a IA não pode resolver a solicitação</p>
          </div>
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Instruções Personalizadas</CardTitle>
          </div>
          <CardDescription>
            Adicione instruções específicas para o comportamento da IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.custom_instructions}
            onChange={(e) => setConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
            placeholder="Ex: Sempre mencione que temos estacionamento gratuito. Não discuta preços pelo WhatsApp..."
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
              <CardTitle>Prévia do Prompt</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
          <CardDescription>
            Veja como o prompt será construído para a IA
          </CardDescription>
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
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
