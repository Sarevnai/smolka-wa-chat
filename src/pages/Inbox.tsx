import { useState, useEffect } from "react";
import { Building, Users, Phone, Mail, Calendar, DollarSign, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

// CRM Lead interface
interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  stage: string;
  value?: number;
  lastContact: string;
  source: string;
  type: "owner" | "tenant";
}

// Mock data para demonstração
const mockLeads: Lead[] = [
  {
    id: "1",
    name: "João Silva",
    phone: "+55 11 99999-1234",
    email: "joao@email.com",
    stage: "novo",
    value: 500000,
    lastContact: "2024-01-10",
    source: "WhatsApp",
    type: "owner"
  },
  {
    id: "2", 
    name: "Maria Santos",
    phone: "+55 11 88888-5678",
    email: "maria@email.com",
    stage: "qualificado",
    value: 2500,
    lastContact: "2024-01-09",
    source: "Site",
    type: "tenant"
  },
  {
    id: "3",
    name: "Pedro Costa",
    phone: "+55 11 77777-9012",
    stage: "negociacao",
    value: 750000,
    lastContact: "2024-01-08",
    source: "Indicação",
    type: "owner"
  },
  {
    id: "4",
    name: "Ana Oliveira",
    phone: "+55 11 66666-3456",
    email: "ana@email.com",
    stage: "novo",
    value: 1800,
    lastContact: "2024-01-07",
    source: "WhatsApp",
    type: "tenant"
  }
];

const stages = {
  owner: [
    { id: "novo", name: "Novo", color: "bg-blue-500" },
    { id: "qualificado", name: "Qualificado", color: "bg-yellow-500" },
    { id: "negociacao", name: "Negociação", color: "bg-orange-500" },
    { id: "fechado", name: "Fechado", color: "bg-green-500" }
  ],
  tenant: [
    { id: "novo", name: "Novo", color: "bg-blue-500" },
    { id: "qualificado", name: "Qualificado", color: "bg-yellow-500" },
    { id: "visitado", name: "Visitado", color: "bg-purple-500" },
    { id: "fechado", name: "Fechado", color: "bg-green-500" }
  ]
};

export default function Inbox() {
  const [leads] = useState<Lead[]>(mockLeads);

  const getLeadsByStageAndType = (stage: string, type: "owner" | "tenant") => {
    return leads.filter(lead => lead.stage === stage && lead.type === type);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const LeadCard = ({ lead }: { lead: Lead }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{lead.name}</h3>
              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{lead.phone}</span>
              </div>
              {lead.email && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{lead.email}</span>
                </div>
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {lead.source}
          </Badge>
        </div>
        
        {lead.value && (
          <div className="flex items-center space-x-1 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-600">
              {formatCurrency(lead.value)}
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Último contato: {formatDate(lead.lastContact)}</span>
        </div>
      </CardContent>
    </Card>
  );

  const PipelineColumn = ({ stage, type }: { stage: { id: string; name: string; color: string }, type: "owner" | "tenant" }) => {
    const stageLeads = getLeadsByStageAndType(stage.id, type);
    
    return (
      <div className="flex-1 min-w-0">
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className={cn("w-3 h-3 rounded-full", stage.color)} />
            <h3 className="font-semibold text-foreground">{stage.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {stageLeads.length}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          {stageLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          
          {stageLeads.length === 0 && (
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum lead neste estágio
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
            <h1 className="text-3xl font-bold text-foreground">CRM - Pipelines</h1>
            <p className="text-muted-foreground">
              Gerencie seus leads de proprietários e inquilinos
            </p>
          </div>
        </div>

        <Tabs defaultValue="owners" className="w-full">
          <TabsList className="mb-8">
            <TabsTrigger value="owners" className="flex items-center space-x-2">
              <Building className="h-4 w-4" />
              <span>Proprietários</span>
            </TabsTrigger>
            <TabsTrigger value="tenants" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Inquilinos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owners">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Pipeline de Proprietários</h2>
                <div className="flex space-x-4 text-sm text-muted-foreground">
                  <span>Total: {leads.filter(l => l.type === 'owner').length} leads</span>
                  <span>Valor total: {formatCurrency(leads.filter(l => l.type === 'owner').reduce((sum, lead) => sum + (lead.value || 0), 0))}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stages.owner.map((stage) => (
                <PipelineColumn key={stage.id} stage={stage} type="owner" />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tenants">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Pipeline de Inquilinos</h2>
                <div className="flex space-x-4 text-sm text-muted-foreground">
                  <span>Total: {leads.filter(l => l.type === 'tenant').length} leads</span>
                  <span>Valor total: {formatCurrency(leads.filter(l => l.type === 'tenant').reduce((sum, lead) => sum + (lead.value || 0), 0))}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stages.tenant.map((stage) => (
                <PipelineColumn key={stage.id} stage={stage} type="tenant" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}