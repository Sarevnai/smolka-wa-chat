import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Bot, Building2, Save, Plus, Trash2, MessageSquare, AlertTriangle, Sparkles, Eye, HelpCircle, Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FAQ {
  question: string;
  answer: string;
}

type AIProvider = 'lovable' | 'openai';

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
            <CardTitle>Perguntas Frequentes (FAQs)</CardTitle>
          </div>
          <CardDescription>
            Respostas prontas para perguntas comuns que a IA usará como referência
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="space-y-2">
            {config.faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-4">
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="flex-1 text-left">
                    <span className="text-sm font-medium">{faq.question}</span>
                  </AccordionTrigger>
                  <Button variant="ghost" size="sm" onClick={() => removeFaq(index)} className="ml-2">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          
          <Separator />
          
          <div className="space-y-2">
            <Label>Adicionar FAQ</Label>
            <Input
              value={newFaq.question}
              onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Pergunta..."
              className="mb-2"
            />
            <Textarea
              value={newFaq.answer}
              onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="Resposta..."
              rows={2}
            />
            <Button variant="outline" onClick={addFaq} className="w-full">
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
            Configure as mensagens que a IA usará em situações específicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="greeting">Mensagem de Saudação</Label>
            <Textarea
              id="greeting"
              value={config.greeting_message}
              onChange={(e) => setConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
              placeholder="Olá! Como posso ajudá-lo?"
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
            <CardTitle>Instruções Especiais</CardTitle>
          </div>
          <CardDescription>
            Instruções adicionais e personalizadas para o comportamento da IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={config.custom_instructions}
            onChange={(e) => setConfig(prev => ({ ...prev, custom_instructions: e.target.value }))}
            placeholder="Adicione instruções específicas para o seu negócio. Ex: 'Sempre pergunte o código do imóvel', 'Mencione nossa promoção de dezembro'..."
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
            <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>
          <CardDescription>
            Visualize como ficará o prompt completo enviado à IA
          </CardDescription>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
              {generatePromptPreview()}
            </pre>
          </CardContent>
        )}
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
