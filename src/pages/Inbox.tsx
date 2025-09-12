import { Building, Users, Phone, Mail, Calendar, DollarSign, MapPin, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { ClickUpIntegration } from "@/components/ClickUpIntegration";
import { cn } from "@/lib/utils";
import { CATEGORIES, PRIORITY_CONFIG } from "@/types/crm";
import { useTickets, useTicketStages, useUpdateTicket, Ticket, TicketStage } from "@/hooks/useTickets";
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
  const { data: proprietarioTickets = [], isLoading: loadingProprietario } = useTickets("proprietario");
  const { data: inquilinoTickets = [], isLoading: loadingInquilino } = useTickets("inquilino");
  const { data: proprietarioStages = [] } = useTicketStages("proprietario");
  const { data: inquilinoStages = [] } = useTicketStages("inquilino");
  const updateTicketMutation = useUpdateTicket();
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const allTickets = [...proprietarioTickets, ...inquilinoTickets];
    const ticket = allTickets.find(t => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const ticketId = active.id as string;
      const newStage = over.id as string;
      
      console.log('Drag ended:', { ticketId, newStage, overId: over.id });
      
      updateTicketMutation.mutate({
        id: ticketId,
        updates: { stage: newStage }
      });
    }
    
    setActiveTicket(null);
  };

  const getTicketsByStageAndType = (stage: string, type: "proprietario" | "inquilino") => {
    const tickets = type === "proprietario" ? proprietarioTickets : inquilinoTickets;
    return tickets.filter(ticket => ticket.stage === stage);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryInfo = (type: "proprietario" | "inquilino", categoryId: string) => {
    const categories = CATEGORIES[type];
    return categories.find(cat => cat.id === categoryId) || categories[0];
  };

  const TicketCard = ({ ticket }: { ticket: Ticket }) => {
    const categoryInfo = getCategoryInfo(ticket.type, ticket.category);
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
            <Badge className={cn("text-sm px-3 py-1", categoryInfo.color)}>
              {categoryInfo.name}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Descrição */}
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{ticket.description}</p>
          )}
          
          <div className="grid grid-cols-1 gap-3">
            {/* Propriedade */}
            {ticket.property_address && (
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{ticket.property_address}</span>
              </div>
            )}
            
            {/* Contato */}
            <div className="flex items-center space-x-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground font-medium">{ticket.phone}</span>
            </div>
            
            {/* Código da Propriedade */}
            {ticket.property_code && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Código:</span>
                <Badge variant="outline" className="text-sm">{ticket.property_code}</Badge>
              </div>
            )}
          </div>
          
          {/* Valor se existir */}
          {ticket.value && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">Valor envolvido:</span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {formatCurrency(ticket.value)}
              </span>
            </div>
          )}
          
          {/* Footer com responsável e último contato */}
          <div className="pt-4 border-t space-y-3">
            {ticket.assigned_to && (
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Responsável:</span>
                <Badge variant="secondary" className="text-sm">{ticket.assigned_to}</Badge>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Criado: {formatDate(ticket.created_at)}</span>
              </div>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatDateTime(ticket.last_contact)}</span>
              </div>
            </div>
          </div>
          
          {/* ClickUp Integration */}
          <ClickUpIntegration ticket={ticket} />
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

  const PipelineColumn = ({ stage, type }: { stage: TicketStage, type: "proprietario" | "inquilino" }) => {
    const stageTickets = getTicketsByStageAndType(stage.name, type);
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
              Gerencie demandas de proprietários e inquilinos dos imóveis administrados
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <Card className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">
                  {proprietarioTickets.length + inquilinoTickets.length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Total de Tickets</p>
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {[...proprietarioTickets, ...inquilinoTickets].filter(t => t.priority === 'alta' || t.priority === 'critica').length}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Tickets Urgentes</p>
              </div>
            </Card>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
        >
          <Tabs defaultValue="proprietarios" className="w-full">
            <TabsList className="mb-8">
              <TabsTrigger value="proprietarios" className="flex items-center space-x-2">
                <Building className="h-4 w-4" />
                <span>Proprietários</span>
                <Badge variant="secondary" className="ml-2">
                  {proprietarioTickets.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="inquilinos" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Inquilinos</span>
                <Badge variant="secondary" className="ml-2">
                  {inquilinoTickets.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="proprietarios">
              {loadingProprietario ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">Carregando tickets...</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-foreground">Demandas de Proprietários</h2>
                      <div className="flex space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Urgentes: {proprietarioTickets.filter(t => t.priority === 'alta' || t.priority === 'critica').length}</span>
                        </div>
                        <span>Valor total: {formatCurrency(proprietarioTickets.reduce((sum, ticket) => sum + (ticket.value || 0), 0))}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-8 overflow-x-auto pb-6">
                    {proprietarioStages.map((stage) => (
                      <PipelineColumn key={stage.id} stage={stage} type="proprietario" />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="inquilinos">
              {loadingInquilino ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">Carregando tickets...</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-foreground">Demandas de Inquilinos</h2>
                      <div className="flex space-x-6 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Urgentes: {inquilinoTickets.filter(t => t.priority === 'alta' || t.priority === 'critica').length}</span>
                        </div>
                        <span>Valor envolvido: {formatCurrency(inquilinoTickets.reduce((sum, ticket) => sum + (ticket.value || 0), 0))}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-8 overflow-x-auto pb-6">
                    {inquilinoStages.map((stage) => (
                      <PipelineColumn key={stage.id} stage={stage} type="inquilino" />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

          </Tabs>

          <DragOverlay>
            {activeTicket ? <TicketCard ticket={activeTicket} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </Layout>
  );
}
