import { AlertTriangle, Filter } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { PRIORITY_CONFIG } from "@/types/crm";
import { useTickets, useTicketStages, useUpdateTicket, Ticket, TicketStage } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import { useAuth } from "@/hooks/useAuth";
import { DeleteTicketDialog } from "@/components/tickets/DeleteTicketDialog";
import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function Inbox() {
  const [viewFilter, setViewFilter] = useState<'all' | 'my' | 'unassigned'>('all');
  const { user } = useAuth();
  const { data: allTickets = [], isLoading } = useTickets();
  const { data: stages = [] } = useTicketStages();
  const { data: categories = [] } = useTicketCategories();
  const updateTicketMutation = useUpdateTicket();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const filteredTickets = allTickets.filter(ticket => {
    if (viewFilter === 'my') return ticket.assigned_to === user?.id;
    if (viewFilter === 'unassigned') return !ticket.assigned_to;
    return true;
  });

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = allTickets.find(t => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const ticketId = active.id as string;
      const newStage = over.id as string;
      
      updateTicketMutation.mutate({
        id: ticketId,
        updates: { stage: newStage }
      });
    }
    
    setActiveTicket(null);
  };

  const getTicketsByStage = (stage: string) => {
    return filteredTickets.filter(ticket => ticket.stage === stage);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getCategoryInfo = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category || { name: categoryId, icon: '', color: 'bg-gray-100 text-gray-700' };
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => {
    const categoryInfo = getCategoryInfo(ticket.category);
    const priorityInfo = PRIORITY_CONFIG[ticket.priority];
    
    return (
      <Card className="mb-6 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardHeader className="pb-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Badge className={cn("text-sm px-3 py-1 font-medium", priorityInfo.color)}>
                {priorityInfo.label}
              </Badge>
              <Badge variant="outline" className="text-sm px-2 py-1">
                {ticket.source}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-mono">#{ticket.id.slice(0, 8)}</span>
              <DeleteTicketDialog ticket={ticket} />
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg text-foreground leading-tight mb-2">{ticket.title}</h3>
            {categoryInfo && (
              <Badge className={cn("text-sm px-3 py-1", categoryInfo.color)}>
                {categoryInfo.icon} {categoryInfo.name}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{ticket.description}</p>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            {ticket.property_address && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">{ticket.property_address}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-muted-foreground font-medium">{ticket.phone}</span>
            </div>

            {ticket.value && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="font-medium text-green-600">{formatCurrency(ticket.value)}</span>
              </div>
            )}

            {ticket.assigned_to && (
              <div className="text-sm">
                <span className="text-muted-foreground">Responsável: </span>
                <Badge variant="secondary">{ticket.assigned_to}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const DraggableTicketCard = ({ ticket }: { ticket: Ticket }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: ticket.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <TicketCard ticket={ticket} />
      </div>
    );
  };

  const PipelineColumn = ({ stage }: { stage: TicketStage }) => {
    const stageTickets = getTicketsByStage(stage.name);
    const urgentTickets = stageTickets.filter(ticket => ticket.priority === "critica" || ticket.priority === "alta");
    
    const { setNodeRef } = useDroppable({
      id: stage.name,
    });
    
    return (
      <div ref={setNodeRef} className="flex-shrink-0 w-96 bg-muted/30 rounded-xl p-6 border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-lg text-foreground">{stage.name}</h3>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1 font-medium">
              {stageTickets.length}
            </Badge>
            {urgentTickets.length > 0 && (
              <Badge variant="destructive" className="text-sm px-3 py-1 font-medium">
                {urgentTickets.length} urgentes
              </Badge>
            )}
          </div>
        </div>
        
        <SortableContext 
          items={stageTickets.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div 
            className="space-y-4 max-h-[700px] overflow-y-auto pr-2 min-h-24"
            style={{ 
              borderRadius: '8px',
              background: stageTickets.length === 0 ? 'rgba(0,0,0,0.02)' : 'transparent'
            }}
          >
            {stageTickets.map((ticket) => (
              <DraggableTicketCard key={ticket.id} ticket={ticket} />
            ))}
            
            {stageTickets.length === 0 && (
              <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum ticket neste estágio
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">CRM - Gestão de Demandas</h1>
            <p className="text-muted-foreground text-lg mt-2">
              Gerencie demandas e tickets de forma eficiente
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <Card className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  {filteredTickets.length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total de Tickets</p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {filteredTickets.filter(t => t.priority === 'alta' || t.priority === 'critica').length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Tickets Urgentes</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrar:</span>
          </div>
          <Select value={viewFilter} onValueChange={(value: 'all' | 'my' | 'unassigned') => setViewFilter(value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tickets</SelectItem>
              <SelectItem value="my">Minhas Demandas</SelectItem>
              <SelectItem value="unassigned">Não Atribuídas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg">Carregando tickets...</p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Pipeline de Tickets</h2>
                  <div className="flex space-x-6 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Urgentes: {filteredTickets.filter(t => t.priority === 'alta' || t.priority === 'critica').length}</span>
                    </div>
                    <span>Valor total: {formatCurrency(filteredTickets.reduce((sum, ticket) => sum + (ticket.value || 0), 0))}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-8 overflow-x-auto pb-6">
                {stages.map((stage) => (
                  <PipelineColumn key={stage.id} stage={stage} />
                ))}
              </div>
            </>
          )}

          <DragOverlay>
            {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </Layout>
  );
}
