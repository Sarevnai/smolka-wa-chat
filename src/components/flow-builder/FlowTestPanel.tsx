import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Play, 
  RotateCcw, 
  Send, 
  Bot, 
  User, 
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Variable,
  List,
  MessageCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlowTest, TestStatus, TestMessage, ExecutionLogEntry, TestConfig } from '@/hooks/useFlowTest';
import { AIFlow } from '@/types/flow';

interface FlowTestPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: AIFlow | null;
  currentNodeId: string | null;
  visitedNodes: string[];
  onCurrentNodeChange: (nodeId: string | null) => void;
  onVisitedNodesChange: (nodes: string[]) => void;
}

function StatusBadge({ status }: { status: TestStatus }) {
  const statusConfig: Record<TestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    idle: { label: 'Parado', variant: 'secondary' },
    running: { label: 'Executando', variant: 'default' },
    waiting_input: { label: 'Aguardando', variant: 'outline' },
    completed: { label: 'Concluído', variant: 'secondary' },
    error: { label: 'Erro', variant: 'destructive' },
  };

  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ChatMessage({ message }: { message: TestMessage }) {
  const isBot = message.type === 'bot';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full flex items-center gap-1">
          <Info className="h-3 w-3" />
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2 my-2", isBot ? "justify-start" : "justify-end")}>
      {isBot && (
        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
          <Bot className="h-3 w-3 text-primary-foreground" />
        </div>
      )}
      <div className={cn(
        "max-w-[80%] rounded-lg px-3 py-2 text-sm",
        isBot 
          ? "bg-card border text-card-foreground" 
          : "bg-primary text-primary-foreground"
      )}>
        {message.content}
      </div>
      {!isBot && (
        <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <User className="h-3 w-3 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}

function LogEntry({ entry }: { entry: ExecutionLogEntry }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-0">
      {entry.success ? (
        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{entry.nodeLabel}</span>
          <Badge variant="outline" className="text-xs">{entry.nodeType}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{entry.action}</p>
        {entry.durationMs > 0 && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" />
            {entry.durationMs}ms
          </span>
        )}
      </div>
    </div>
  );
}

export function FlowTestPanel({ 
  open, 
  onOpenChange, 
  flow,
  onCurrentNodeChange,
  onVisitedNodesChange,
}: FlowTestPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const {
    status,
    currentNodeId,
    variables,
    messages,
    executionLog,
    visitedNodes,
    error,
    config,
    startTest,
    sendTestMessage,
    resetTest,
    updateConfig,
  } = useFlowTest(flow);

  // Sync with parent
  useEffect(() => {
    onCurrentNodeChange(currentNodeId);
  }, [currentNodeId, onCurrentNodeChange]);

  useEffect(() => {
    onVisitedNodesChange(visitedNodes);
  }, [visitedNodes, onVisitedNodesChange]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendTestMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'Sim', value: 'sim' },
    { label: 'Não', value: 'não' },
    { label: 'Vendi', value: 'vendi' },
    { label: 'Aluguei', value: 'aluguei' },
    { label: 'Não sei', value: 'não sei' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-primary" />
              Modo de Teste
            </SheetTitle>
            <StatusBadge status={status} />
          </div>
        </SheetHeader>

        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="chat" className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="variables" className="flex items-center gap-1">
              <Variable className="h-4 w-4" />
              Variáveis
            </TabsTrigger>
            <TabsTrigger value="log" className="flex items-center gap-1">
              <List className="h-4 w-4" />
              Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
            {/* Config Section */}
            {status === 'idle' && (
              <div className="p-4 border-b space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="real-integrations" className="text-sm">
                    Testar integrações reais (Vista)
                  </Label>
                  <Switch
                    id="real-integrations"
                    checked={config.testRealIntegrations}
                    onCheckedChange={(checked) => updateConfig({ testRealIntegrations: checked })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact-name" className="text-sm">Nome do contato</Label>
                  <Input
                    id="contact-name"
                    value={config.contactName}
                    onChange={(e) => updateConfig({ contactName: e.target.value })}
                    placeholder="Cliente Teste"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contact-phone" className="text-sm">Telefone</Label>
                  <Input
                    id="contact-phone"
                    value={config.contactPhone}
                    onChange={(e) => updateConfig({ contactPhone: e.target.value })}
                    placeholder="+5548999999999"
                  />
                </div>
              </div>
            )}

            {/* Chat Area */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 && status === 'idle' && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Play className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">Clique em "Iniciar" para testar o fluxo</p>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mt-2">
                  ❌ {error}
                </div>
              )}
              <div ref={chatEndRef} />
            </ScrollArea>

            {/* Quick Actions */}
            {status === 'waiting_input' && (
              <div className="px-4 py-2 border-t flex gap-2 flex-wrap">
                {quickActions.map((action) => (
                  <Button
                    key={action.value}
                    variant="outline"
                    size="sm"
                    onClick={() => sendTestMessage(action.value)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t">
              {status === 'idle' ? (
                <Button 
                  className="w-full" 
                  onClick={startTest}
                  disabled={!flow}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Simulação
                </Button>
              ) : status === 'completed' || status === 'error' ? (
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={resetTest}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reiniciar Teste
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={status === 'waiting_input' ? "Digite sua resposta..." : "Aguarde..."}
                    disabled={status !== 'waiting_input'}
                  />
                  <Button 
                    onClick={handleSend} 
                    disabled={!inputValue.trim() || status !== 'waiting_input'}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={resetTest}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="variables" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full p-4">
              {Object.keys(variables).length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Nenhuma variável capturada ainda
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(variables).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="font-mono text-sm text-primary">{key}</span>
                      <span className="text-sm truncate ml-2 max-w-[200px]">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="log" className="flex-1 overflow-hidden m-0">
            <ScrollArea className="h-full p-4">
              {executionLog.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-8">
                  Nenhum log ainda
                </div>
              ) : (
                <div className="space-y-1">
                  {executionLog.map((entry, idx) => (
                    <LogEntry key={`${entry.nodeId}-${idx}`} entry={entry} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
