import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, Clock, MessageCircle, GripVertical } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineStage, PipelineConversation } from '@/hooks/usePipelineConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getContactTypeLabel } from '@/lib/departmentConfig';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';

interface KanbanBoardProps {
  stages: PipelineStage[];
  loading: boolean;
  departmentCode?: string;
  onMoveConversation?: (conversationId: string, newStageId: string) => void;
}

function DraggableConversationCard({ conversation, departmentCode }: { conversation: PipelineConversation; departmentCode?: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: conversation.id,
    data: { conversation },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={cn(isDragging && 'opacity-30')}>
      <ConversationCard conversation={conversation} departmentCode={departmentCode} dragListeners={listeners} />
    </div>
  );
}

function ConversationCard({ conversation, departmentCode, dragListeners }: { conversation: PipelineConversation; departmentCode?: string; dragListeners?: any }) {
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
            <div
              className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              {...dragListeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
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

function DroppableStageColumn({ stage, departmentCode }: { stage: PipelineStage; departmentCode?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div className="flex-shrink-0 w-72" ref={setNodeRef}>
      <Card className={cn(
        "h-full bg-surface-muted/30 border-border transition-colors",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}>
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
                <DraggableConversationCard 
                  key={conversation.id} 
                  conversation={conversation}
                  departmentCode={departmentCode}
                />
              ))}
              {stage.conversations.length === 0 && (
                <div className={cn(
                  "text-center py-8 text-muted-foreground text-sm",
                  isOver && "border-2 border-dashed border-primary/30 rounded-lg"
                )}>
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  {isOver ? 'Soltar aqui' : 'Nenhuma conversa'}
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export function KanbanBoard({ stages, loading, departmentCode, onMoveConversation }: KanbanBoardProps) {
  const [activeConversation, setActiveConversation] = useState<PipelineConversation | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const conv = event.active.data.current?.conversation as PipelineConversation;
    setActiveConversation(conv || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveConversation(null);

    if (!over || !onMoveConversation) return;

    const conversationId = active.id as string;
    const newStageId = over.id as string;

    // Find current stage of conversation
    const currentStage = stages.find(s => s.conversations.some(c => c.id === conversationId));
    if (currentStage?.id === newStageId) return;

    onMoveConversation(conversationId, newStageId);
  };

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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <DroppableStageColumn key={stage.id} stage={stage} departmentCode={departmentCode} />
        ))}
      </div>
      <DragOverlay>
        {activeConversation ? (
          <div className="w-72 opacity-90 rotate-2">
            <ConversationCard conversation={activeConversation} departmentCode={departmentCode} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
