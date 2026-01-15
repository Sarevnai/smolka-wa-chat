import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, User, Clock } from 'lucide-react';
import { useConversationState } from '@/hooks/useConversationState';

interface AIHandoverBannerProps {
  conversationId?: string;
  phoneNumber?: string;
}

export function AIHandoverBanner({ conversationId, phoneNumber }: AIHandoverBannerProps) {
  const { 
    isAIActive, 
    isLoading, 
    isWithinBusinessHours,
    takeoverConversation, 
    releaseToAI 
  } = useConversationState(conversationId || null, phoneNumber);

  const withinHours = isWithinBusinessHours();

  if (!isAIActive && withinHours) {
    return null; // Don't show banner during business hours when human is handling
  }

  return (
    <div className={`flex items-center justify-between px-4 py-2 ${
      isAIActive 
        ? 'bg-primary/10 border-b border-primary/20' 
        : 'bg-muted border-b border-border'
    }`}>
      <div className="flex items-center gap-2">
        {isAIActive ? (
          <>
            <Bot className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Agente IA ativo
            </span>
            {!withinHours && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Fora do horário comercial
              </span>
            )}
          </>
        ) : (
          <>
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Atendimento humano
            </span>
          </>
        )}
      </div>

      <div className="flex gap-2">
        {isAIActive ? (
          <Button
            size="sm"
            variant="default"
            onClick={takeoverConversation}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            <User className="h-3 w-3 mr-1" />
            Assumir atendimento
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={releaseToAI}
            disabled={isLoading}
            className="h-7 text-xs"
          >
            <Bot className="h-3 w-3 mr-1" />
            Liberar para IA
          </Button>
        )}
      </div>
    </div>
  );
}
