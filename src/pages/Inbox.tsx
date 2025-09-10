import { useState } from "react";
import { Building, Users, Phone, Mail, Calendar, DollarSign, MapPin, Clock, AlertTriangle, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
import { Ticket, CATEGORIES, PRIORITY_CONFIG } from "@/types/crm";
import { mockTickets, stages } from "@/data/mockTickets";


export default function Inbox() {
  const [tickets] = useState<Ticket[]>(mockTickets);

  const getTicketsByStageAndType = (stage: string, type: "proprietario" | "inquilino") => {
    return tickets.filter(ticket => ticket.stage === stage && ticket.type === type);
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
      <Card className="mb-4 hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardContent className="p-4">
          {/* Header com prioridade e categoria */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Badge className={cn("text-xs px-2 py-1", priorityInfo.color)}>
                {priorityInfo.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {ticket.source}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Título e ID */}
          <div className="mb-3">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-foreground leading-tight">{ticket.title}</h3>
              <span className="text-xs text-muted-foreground font-mono">#{ticket.id}</span>
            </div>
            <Badge className={cn("text-xs", categoryInfo.color)}>
              {categoryInfo.name}
            </Badge>
          </div>
          
          {/* Descrição */}
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{ticket.description}</p>
          
          {/* Propriedade */}
          <div className="flex items-center space-x-1 mb-2 text-sm">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{ticket.property.address}</span>
          </div>
          
          {/* Contato */}
          <div className="flex items-center space-x-1 mb-2 text-sm">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{ticket.phone}</span>
          </div>
          
          {/* Valor se existir */}
          {ticket.value && (
            <div className="flex items-center space-x-1 mb-2">
              <DollarSign className="h-3 w-3 text-green-600" />
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(ticket.value)}
              </span>
            </div>
          )}
          
          {/* Footer com responsável e último contato */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              {ticket.assignedTo && (
                <>
                  <span>Responsável: {ticket.assignedTo}</span>
                </>
              )}
            </div>
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatDateTime(ticket.lastContact)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PipelineColumn = ({ stage, type }: { stage: { id: string; name: string; color: string }, type: "proprietario" | "inquilino" }) => {
    const stageTickets = getTicketsByStageAndType(stage.id, type);
    
    return (
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-foreground">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {stageTickets.length}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
          {stageTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          
          {stageTickets.length === 0 && (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum ticket neste estágio
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">CRM - Gestão de Demandas</h1>
            <p className="text-muted-foreground">
              Gerencie demandas de proprietários e inquilinos dos imóveis administrados
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total de Tickets</div>
              <div className="text-2xl font-bold text-foreground">{tickets.length}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Tickets Urgentes</div>
              <div className="text-2xl font-bold text-orange-600">
                {tickets.filter(t => t.priority === 'alta' || t.priority === 'critica').length}
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="proprietarios" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="proprietarios" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Proprietários</span>
              <Badge variant="secondary" className="ml-2">
                {tickets.filter(t => t.type === 'proprietario').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="inquilinos" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Inquilinos</span>
              <Badge variant="secondary" className="ml-2">
                {tickets.filter(t => t.type === 'inquilino').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proprietarios">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Demandas de Proprietários</h2>
                <div className="flex space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Urgentes: {tickets.filter(t => t.type === 'proprietario' && (t.priority === 'alta' || t.priority === 'critica')).length}</span>
                  </div>
                  <span>Valor total: {formatCurrency(tickets.filter(t => t.type === 'proprietario').reduce((sum, ticket) => sum + (ticket.value || 0), 0))}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto">
              {stages.proprietario.map((stage) => (
                <PipelineColumn key={stage.id} stage={stage} type="proprietario" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="inquilinos">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Demandas de Inquilinos</h2>
                <div className="flex space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Urgentes: {tickets.filter(t => t.type === 'inquilino' && (t.priority === 'alta' || t.priority === 'critica')).length}</span>
                  </div>
                  <span>Valor envolvido: {formatCurrency(tickets.filter(t => t.type === 'inquilino').reduce((sum, ticket) => sum + (ticket.value || 0), 0))}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 overflow-x-auto">
              {stages.inquilino.map((stage) => (
                <PipelineColumn key={stage.id} stage={stage} type="inquilino" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}