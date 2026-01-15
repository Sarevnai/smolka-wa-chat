import { useNavigate } from 'react-router-dom';
import { Phone, User, Clock, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineStage, PipelineConversation } from '@/hooks/usePipelineConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getContactTypeLabel } from '@/lib/departmentConfig';

interface KanbanBoardProps {
  stages: PipelineStage[];
  loading: boolean;
  departmentCode?: string;
  onMoveConversation?: (conversationId: string, newStageId: string) => void;
}

function ConversationCard({ conversation, departmentCode }: { conversation: PipelineConversation; departmentCode?: string }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/chat/${conversation.phone_number}`);
  };

  const contactName = conversation.contact?.name || conversation.phone_number;
  const timeAgo = conversation.last_message_at
    ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })
    : 'Sem mensagens';

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow bg-surface-card border-border"
      onClick={handleClick}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gold-primary/20 flex items-center justify-center flex-shrink-0">
              <User className="h-4 w-4 text-gold-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{contactName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {conversation.phone_number}
              </p>
            </div>
          </div>
          {conversation.qualification_score && (
            <Badge variant="secondary" className="text-xs">
              {conversation.qualification_score}%
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
          {conversation.contact?.contact_type && (() => {
            const typeConfig = getContactTypeLabel(conversation.contact.contact_type, departmentCode);
            return typeConfig ? (
              <Badge variant="outline" className={cn("text-xs", typeConfig.color)}>
                {typeConfig.label}
              </Badge>
            ) : null;
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

function StageColumn({ stage, departmentCode }: { stage: PipelineStage; departmentCode?: string }) {
  return (
    <div className="flex-shrink-0 w-72">
      <Card className="h-full bg-surface-muted/30 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: stage.color }}
              />
              {stage.name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {stage.conversations.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {stage.conversations.map((conversation) => (
                <ConversationCard 
                  key={conversation.id} 
                  conversation={conversation}
                  departmentCode={departmentCode}
                />
              ))}
              {stage.conversations.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma conversa
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard({ stages, loading, departmentCode }: KanbanBoardProps) {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-[500px] rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum stage configurado para este departamento</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <StageColumn key={stage.id} stage={stage} departmentCode={departmentCode} />
      ))}
    </div>
  );
}
