import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Bot, 
  Send, 
  X,
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
  const [isOpen, setIsOpen] = useState(false);
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
    if (!message.trim() || isLoading) {
      return;
    }

    const currentMessage = message.trim();
    console.log('Sending message from widget:', currentMessage);
    setMessage('');
    
    const response = await sendMessage(currentMessage);
    if (!response) {
      console.log('Message sending failed, restoring input');
      setMessage(currentMessage);
    }
  };

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);
    
    if (open && !isConnected && !isLoading) {
      console.log('Starting conversation from widget open');
      await startConversation();
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsOpen(false);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {/* Trigger button positioned at top-right */}
      <DialogTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "fixed top-1/2 right-4 -translate-y-1/2 z-40 w-12 h-12 rounded-full shadow-lg",
            "bg-primary hover:bg-primary/90 transition-all duration-300",
            "hover:scale-110",
            className
          )}
        >
          <Bot className="h-6 w-6" />
        </Button>
      </DialogTrigger>

      {/* Full-screen modal dialog */}
      <DialogContent className={cn(
        "w-[90vw] h-[85vh] max-w-4xl",
        "p-0 gap-0 border-none shadow-2xl",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "rounded-lg"
      )}>
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">Assistente de IA</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <span className="text-sm text-muted-foreground">
                    {isConnected ? 'Conectada' : 'Desconectada'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isConnected && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleDisconnect}
                  className="h-9 w-9"
                >
                  <Power className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content area */}
        <div className="flex flex-col h-full min-h-0 p-6">
          {!isConnected ? (
            // Connection screen
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Assistente de IA</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  {isLoading ? 'Conectando com a IA...' : 'Conecte-se para obter ajuda inteligente e automatizar suas tarefas'}
                </p>
                <Button 
                  onClick={startConversation} 
                  disabled={isLoading}
                  size="lg"
                  className="px-8"
                >
                  {isLoading ? 'Conectando...' : 'Iniciar Conversa'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Messages area */}
              <ScrollArea className="flex-1 min-h-0 mb-6" ref={scrollAreaRef}>
                <div className="space-y-4 pr-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex gap-3",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg p-4",
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
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
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-4">
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
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-3">Ações rápidas:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action, index) => (
                      <Button
                        key={index}
                        size="sm"
                        variant="outline"
                        onClick={() => sendMessage(action.command)}
                        className="text-sm h-10 justify-start"
                        disabled={isLoading}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message input - Always visible at bottom */}
              <div className="border-t pt-4">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    disabled={isLoading}
                    className="flex-1 h-12"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    disabled={isLoading || !message.trim()}
                    className="h-12 w-12 flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AICommunicatorWidget;