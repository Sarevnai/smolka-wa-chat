import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, RefreshCw, Send, Bot, User, Loader2, 
  CheckCircle2, AlertCircle, MessageCircle, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimulatedMessage {
  id: string;
  type: 'bot' | 'user' | 'system' | 'image';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

interface SimulationStep {
  id: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  details?: string;
}

interface PortalLeadSimulatorProps {
  onClose?: () => void;
}

interface VistaProperty {
  codigo: string;
  categoria: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  dormitorios: number;
  suites: number;
  area_util: number;
  vagas: number;
  valor_venda: number;
  valor_locacao: number;
  foto_destaque: string;
  descricao: string;
  finalidade: string;
}

export function PortalLeadSimulator({ onClose }: PortalLeadSimulatorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [messages, setMessages] = useState<SimulatedMessage[]>([]);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [simulationPhase, setSimulationPhase] = useState<'idle' | 'initial' | 'conversation'>('idle');
  const [currentProperty, setCurrentProperty] = useState<VistaProperty | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Lead configuration
  const [leadConfig, setLeadConfig] = useState({
    name: 'João Silva',
    phone: '5548999887766',
    portal: 'ZAP Imóveis',
    listingId: '29908',
    message: 'Olá, tenho interesse neste imóvel'
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (type: SimulatedMessage['type'], content: string, imageUrl?: string) => {
    const msg: SimulatedMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type,
      content,
      imageUrl,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, msg]);
  };

  const updateStep = (id: string, updates: Partial<SimulationStep>) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addStep = (action: string): string => {
    const id = `step-${Date.now()}`;
    setSteps(prev => [...prev, { id, action, status: 'pending' }]);
    return id;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const fetchPropertyFromVista = async (codigo: string): Promise<VistaProperty | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('vista-get-property', {
        body: { codigo }
      });

      if (error) {
        console.error('Error fetching property:', error);
        return null;
      }

      if (!data?.success || !data?.property) {
        console.error('Property not found:', data?.error);
        return null;
      }

      return data.property as VistaProperty;
    } catch (error) {
      console.error('Exception fetching property:', error);
      return null;
    }
  };

  const startSimulation = async () => {
    setIsRunning(true);
    setMessages([]);
    setSteps([]);
    setSimulationPhase('initial');
    setWaitingForInput(false);
    setCurrentProperty(null);

    try {
      // Step 1: Receive webhook
      const step1 = addStep('Recebendo webhook do portal...');
      await delay(800);
      updateStep(step1, { status: 'running' });
      await delay(500);
      addMessage('system', `📥 Lead recebido do ${leadConfig.portal}`);
      updateStep(step1, { status: 'completed', details: `Lead: ${leadConfig.name} | Tel: ${leadConfig.phone}` });

      // Step 2: Create/find contact
      const step2 = addStep('Criando contato no sistema...');
      await delay(600);
      updateStep(step2, { status: 'running' });
      await delay(400);
      updateStep(step2, { status: 'completed', details: `Contato criado: ${leadConfig.name}` });

      // Step 3: Create conversation
      const step3 = addStep('Criando conversa...');
      await delay(500);
      updateStep(step3, { status: 'running' });
      await delay(300);
      updateStep(step3, { status: 'completed', details: 'Conversa ativa no departamento Vendas' });

      // Step 4: Detect portal lead
      const step4 = addStep('Detectando lead de portal...');
      await delay(400);
      updateStep(step4, { status: 'running' });
      await delay(300);
      updateStep(step4, { status: 'completed', details: `origin_listing_id: ${leadConfig.listingId}` });

      // Step 5: Fetch property from Vista CRM (REAL API CALL)
      const step5 = addStep('Buscando imóvel no Vista CRM...');
      updateStep(step5, { status: 'running' });
      
      const property = await fetchPropertyFromVista(leadConfig.listingId);
      
      if (!property) {
        updateStep(step5, { status: 'error', details: 'Imóvel não encontrado no Vista' });
        addMessage('system', `❌ Imóvel código ${leadConfig.listingId} não encontrado no Vista CRM`);
        toast.error(`Imóvel ${leadConfig.listingId} não encontrado. Verifique o código.`);
        setIsRunning(false);
        return;
      }
      
      setCurrentProperty(property);
      updateStep(step5, { status: 'completed', details: `✅ Encontrado: ${property.bairro} - ${property.categoria}` });

      // Step 6: Send greeting message
      const step6 = addStep('Enviando mensagem de boas-vindas...');
      await delay(500);
      updateStep(step6, { status: 'running' });
      await delay(400);
      
      const greeting = `Olá, ${leadConfig.name}! 👋\n\nSou a Helena da Smolka Imóveis!\n\nVi que você se interessou por esse imóvel no ${leadConfig.portal}:`;
      addMessage('bot', greeting);
      updateStep(step6, { status: 'completed' });

      // Step 7: Send property photo
      const step7 = addStep('Enviando foto do imóvel...');
      await delay(600);
      updateStep(step7, { status: 'running' });
      await delay(500);
      
      if (property.foto_destaque) {
        addMessage('image', '🏠 Foto do imóvel', property.foto_destaque);
      } else {
        addMessage('system', '⚠️ Imóvel sem foto de destaque');
      }
      updateStep(step7, { status: 'completed' });

      // Step 8: Send formatted property details
      const step8 = addStep('Enviando detalhes formatados...');
      await delay(500);
      updateStep(step8, { status: 'running' });
      await delay(400);
      
      const propertyDetails = formatPropertyDetails(property, leadConfig.portal);
      addMessage('bot', propertyDetails);
      updateStep(step8, { status: 'completed' });

      // Step 9: Send follow-up question
      const step9 = addStep('Enviando pergunta de qualificação...');
      await delay(400);
      updateStep(step9, { status: 'running' });
      await delay(300);
      addMessage('bot', 'Gostou da opção? Está buscando algo diferente? 😊');
      updateStep(step9, { status: 'completed' });

      // Enable conversation mode
      setSimulationPhase('conversation');
      setWaitingForInput(true);
      addMessage('system', '💬 Agora você pode simular respostas do cliente');

    } catch (error) {
      console.error('Simulation error:', error);
      addMessage('system', '❌ Erro na simulação');
      toast.error('Erro ao executar simulação');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !waitingForInput || !currentProperty) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    setWaitingForInput(false);
    
    // Add user message
    addMessage('user', userMessage);
    
    // Simulate AI processing
    await delay(800);
    
    // Generate response based on user input
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('gostei') || lowerMessage.includes('interesse') || lowerMessage.includes('visita')) {
      // User wants to schedule visit
      addMessage('bot', `Ótimo, ${leadConfig.name}! 🎉\n\nPosso agendar uma visita para você conhecer o imóvel pessoalmente.\n\nQual dia e horário seria melhor pra você?`);
      addMessage('system', '✅ Lead qualificado - Aguardando agendamento de visita');
    } else if (lowerMessage.includes('diferente') || lowerMessage.includes('outro') || lowerMessage.includes('3 quartos') || lowerMessage.includes('maior')) {
      // User wants something different
      addMessage('bot', `Entendi, ${leadConfig.name}! Me conta mais:\n\n📍 Qual região você prefere?\n🏠 Quantos quartos precisa?\n💰 Qual sua faixa de orçamento?\n\nAssim posso buscar opções mais alinhadas com o que você procura! 😊`);
      addMessage('system', '🔄 Lead quer algo diferente - Iniciando qualificação');
    } else if (lowerMessage.includes('corretor') || lowerMessage.includes('cliente') || lowerMessage.includes('parceria')) {
      // Broker detection
      addMessage('bot', `Obrigada pelo interesse! No momento nosso atendimento é direto ao comprador.\n\nSe você tem um cliente interessado, peça para ele entrar em contato diretamente conosco.\n\nBoas vendas! 😊`);
      addMessage('system', '🚫 Lead desqualificado - Identificado como corretor');
    } else if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('quanto')) {
      // Price question
      const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentProperty.valor_venda || currentProperty.valor_locacao);
      addMessage('bot', `O valor deste imóvel é ${priceFormatted}! 💰\n\nÉ um ${currentProperty.categoria?.toLowerCase() || 'imóvel'} de ${currentProperty.dormitorios} dormitório(s) em ${currentProperty.bairro}.\n\nTem interesse em agendar uma visita?`);
    } else {
      // Default response
      addMessage('bot', `Entendi! 😊\n\nSobre o imóvel em ${currentProperty.bairro}, posso te ajudar com mais informações ou agendar uma visita.\n\nO que você gostaria de saber?`);
    }
    
    setWaitingForInput(true);
  };

  const resetSimulation = () => {
    setMessages([]);
    setSteps([]);
    setSimulationPhase('idle');
    setWaitingForInput(false);
    setIsRunning(false);
    setInputValue('');
    setCurrentProperty(null);
  };

  const quickResponses = [
    { label: 'Gostei, quero visitar!', value: 'Gostei! Quero agendar uma visita' },
    { label: 'Algo diferente', value: 'Tô buscando algo com 3 quartos' },
    { label: 'Qual o preço?', value: 'Qual o valor desse imóvel?' },
    { label: 'Sou corretor', value: 'Sou corretor, tenho um cliente interessado' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Configuration Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Configurar Lead de Teste
          </CardTitle>
          <CardDescription>
            Configure os dados do lead simulado para testar o fluxo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="leadName">Nome do Lead</Label>
              <Input
                id="leadName"
                value={leadConfig.name}
                onChange={(e) => setLeadConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="João Silva"
                disabled={isRunning}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="leadPhone">Telefone</Label>
              <Input
                id="leadPhone"
                value={leadConfig.phone}
                onChange={(e) => setLeadConfig(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="5548999887766"
                disabled={isRunning}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="portal">Portal de Origem</Label>
              <Select
                value={leadConfig.portal}
                onValueChange={(v) => setLeadConfig(prev => ({ ...prev, portal: v }))}
                disabled={isRunning}
              >
                <SelectTrigger id="portal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZAP Imóveis">ZAP Imóveis</SelectItem>
                  <SelectItem value="Viva Real">Viva Real</SelectItem>
                  <SelectItem value="OLX">OLX</SelectItem>
                  <SelectItem value="Imovelweb">Imovelweb</SelectItem>
                  <SelectItem value="Canal Pro">Canal Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="listingId">Código do Imóvel</Label>
              <Input
                id="listingId"
                value={leadConfig.listingId}
                onChange={(e) => setLeadConfig(prev => ({ ...prev, listingId: e.target.value }))}
                placeholder="12345"
                disabled={isRunning}
              />
            </div>
          </div>

          <Separator />

          {/* Execution Steps */}
          {steps.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Etapas da Execução</Label>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm py-1">
                    {step.status === 'pending' && <div className="h-4 w-4 rounded-full border-2 border-muted" />}
                    {step.status === 'running' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {step.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {step.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span className={cn(
                      step.status === 'completed' && 'text-muted-foreground',
                      step.status === 'running' && 'text-primary font-medium'
                    )}>
                      {step.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={startSimulation}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Simulando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Simulação
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={resetSimulation}
              disabled={isRunning}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chat Simulation */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Simulação do WhatsApp
          </CardTitle>
          <CardDescription>
            Visualize como as mensagens serão enviadas
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 border rounded-lg bg-muted/30 p-4" style={{ height: '350px' }}>
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Clique em "Iniciar Simulação" para ver o fluxo</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.type === 'system' ? (
                      <div className="flex justify-center">
                        <Badge variant="outline" className="text-xs">
                          {msg.content}
                        </Badge>
                      </div>
                    ) : msg.type === 'image' ? (
                      <div className="flex justify-start">
                        <div className="bg-card border rounded-lg p-2 max-w-[80%]">
                          <img 
                            src={msg.imageUrl} 
                            alt={msg.content}
                            className="rounded-md w-full max-w-[250px] h-auto"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{msg.content}</p>
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        "flex",
                        msg.type === 'user' ? 'justify-end' : 'justify-start'
                      )}>
                        <div className={cn(
                          "rounded-lg px-3 py-2 max-w-[80%] text-sm",
                          msg.type === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-card border'
                        )}>
                          <div className="flex items-center gap-1 mb-1">
                            {msg.type === 'bot' ? (
                              <Bot className="h-3 w-3" />
                            ) : (
                              <User className="h-3 w-3" />
                            )}
                            <span className="text-xs opacity-70">
                              {msg.type === 'bot' ? 'Helena' : leadConfig.name}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Quick responses */}
          {waitingForInput && (
            <div className="flex flex-wrap gap-2 mt-3">
              {quickResponses.map((resp) => (
                <Button
                  key={resp.label}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInputValue(resp.value);
                  }}
                >
                  {resp.label}
                </Button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 mt-3">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={waitingForInput ? "Simule a resposta do cliente..." : "Inicie a simulação primeiro"}
              disabled={!waitingForInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!waitingForInput || !inputValue.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatPropertyDetails(property: VistaProperty, portalOrigin?: string): string {
  const valor = property.valor_venda > 0 ? property.valor_venda : property.valor_locacao;
  const tipoTransacao = property.valor_venda > 0 ? 'Venda' : 'Locação';
  
  const priceFormatted = new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    maximumFractionDigits: 0 
  }).format(valor);

  const endereco = [property.endereco, property.numero].filter(Boolean).join(', ');
  const localizacao = [property.bairro, property.cidade, property.uf].filter(Boolean).join(' - ');

  const lines = [
    `📍 ${endereco}`,
    `${localizacao}`,
    '',
    `• ${property.dormitorios} dormitório(s)${property.suites ? `, sendo ${property.suites} suíte(s)` : ''}`,
    property.area_util ? `• Área: ${property.area_util}m²` : null,
    property.vagas ? `• ${property.vagas} vaga(s) de garagem` : null,
    `• ${tipoTransacao}: ${priceFormatted}`,
    '',
    `🔗 smolkaimoveis.com.br/imovel/${property.codigo}`
  ].filter(Boolean);

  return lines.join('\n');
}
