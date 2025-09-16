import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Send, 
  Minimize2, 
  Maximize2, 
  Power,
  User,
  Zap
} from 'lucide-react';
import { useAICommunicator } from '@/hooks/useAICommunicator';
import { cn } from '@/lib/utils';

interface AICommunicatorWidgetProps {
  className?: string;
}

const AICommunicatorWidget: React.FC<AICommunicatorWidgetProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const {
    conversation,
    isLoading,
    isConnected,
    startConversation,
    sendMessage,
    disconnect,
    getMessages
  } = useAICommunicator();

  const messages = getMessages();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const currentMessage = message;
    setMessage('');
    
    await sendMessage(currentMessage);
  };

  const handleToggle = () => {
    if (!isConnected) {
      startConversation();
    }
    setIsExpanded(!isExpanded);
  };

  const handleDisconnect = () => {
    disconnect();
    setIsExpanded(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Quick action buttons
  const quickActions = [
    { label: 'Relatório do Dia', command: 'Gere um relatório de hoje' },
    { label: 'Status Pipeline', command: 'Como está o pipeline de tickets?' },
    { label: 'Contatos Ativos', command: 'Quantos contatos ativos temos?' },
    { label: 'Criar Ticket', command: 'Como criar um novo ticket?' }
  ];

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 transition-all duration-300",
      isExpanded ? "w-96 h-[32rem]" : "w-16 h-16",
      className
    )}>
      {!isExpanded ? (
        // Minimized state - floating button
        <Button
          onClick={handleToggle}
          size="icon"
          className="w-16 h-16 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Bot className="h-8 w-8" />
        </Button>
      ) : (
        // Expanded state - chat widget
        <Card className="w-full h-full shadow-xl">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-base">IA Comunicadora</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      isConnected ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <span className="text-xs text-muted-foreground">
                      {isConnected ? 'Conectada' : 'Desconectada'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {isConnected && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleDisconnect}
                    className="h-8 w-8"
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col h-full p-3">
            {!isConnected ? (
              // Connection screen
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-medium mb-2">Assistente de IA</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte-se para obter ajuda inteligente
                  </p>
                  <Button onClick={startConversation} disabled={isLoading}>
                    {isLoading ? 'Conectando...' : 'Iniciar Conversa'}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Messages area */}
                <ScrollArea className="flex-1 mb-3" ref={scrollAreaRef}>
                  <div className="space-y-3">
                    {messages.map((msg, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex gap-2",
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <Bot className="h-6 w-6 mt-1 text-primary flex-shrink-0" />
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3 text-sm",
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.actions && msg.actions.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.actions.map((action: any, actionIndex: number) => (
                                <Badge key={actionIndex} variant="secondary" className="text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  {action.type}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="text-xs opacity-70 mt-2">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <User className="h-6 w-6 mt-1 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex gap-2 justify-start">
                        <Bot className="h-6 w-6 mt-1 text-primary" />
                        <div className="bg-muted rounded-lg p-3 text-sm">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Quick actions */}
                {messages.length <= 1 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-2">Ações rápidas:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {quickActions.map((action, index) => (
                        <Button
                          key={index}
                          size="sm"
                          variant="outline"
                          onClick={() => sendMessage(action.command)}
                          className="text-xs h-8"
                          disabled={isLoading}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message input */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={isLoading || !message.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AICommunicatorWidget;