import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  useLeads, 
  useLeadChannels, 
  useExportLeads, 
  useSendToCRM,
  useScheduleRemarketing,
  type LeadsFilters 
} from "@/hooks/useLeadsManagement";
import { 
  Users, 
  Download, 
  Send, 
  RefreshCw, 
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  Bot,
  BotOff,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function LeadsManagement() {
  const [filters, setFilters] = useState<LeadsFilters>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useLeads(filters, page, pageSize);
  const { data: channels } = useLeadChannels();
  const exportLeads = useExportLeads();
  const sendToCRM = useSendToCRM();
  const scheduleRemarketing = useScheduleRemarketing();

  const toggleSelectAll = () => {
    if (selectedLeads.length === data?.leads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(data?.leads.map(l => l.id) || []);
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) 
        ? prev.filter(l => l !== id) 
        : [...prev, id]
    );
  };

  const handleExport = () => {
    if (selectedLeads.length > 0) {
      exportLeads.mutate(selectedLeads);
    }
  };

  const handleSendToCRM = () => {
    if (selectedLeads.length > 0) {
      sendToCRM.mutate(selectedLeads);
      setSelectedLeads([]);
    }
  };

  const handleRemarketing = () => {
    if (selectedLeads.length > 0) {
      scheduleRemarketing.mutate(selectedLeads);
      setSelectedLeads([]);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
              <p className="text-muted-foreground">
                Tenha a visão completa dos leads que entraram em contato
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="pl-9"
                  />
                </div>

                <Select
                  value={filters.channel || 'all'}
                  onValueChange={(v) => setFilters(f => ({ ...f, channel: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os canais</SelectItem>
                    {channels?.map(channel => (
                      <SelectItem key={channel} value={channel}>{channel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.aiAttended === null ? 'all' : filters.aiAttended ? 'attended' : 'not_attended'}
                  onValueChange={(v) => setFilters(f => ({ 
                    ...f, 
                    aiAttended: v === 'all' ? null : v === 'attended' 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status IA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="attended">Atendido pela IA</SelectItem>
                    <SelectItem value="not_attended">Sem atendimento</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.crmStatus || 'all'}
                  onValueChange={(v) => setFilters(f => ({ ...f, crmStatus: v === 'all' ? undefined : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status CRM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sent">Enviado</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="not_ready">Não pronto</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {filters.dateFrom 
                        ? format(filters.dateFrom, 'dd/MM/yyyy')
                        : 'Data inicial'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(f => ({ ...f, dateFrom: date }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="text-sm text-muted-foreground">
          Exibindo {data?.leads.length || 0} de {data?.totalCount || 0} leads
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.length === data?.leads.length && data?.leads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Operação</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>CRM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <div className="h-12 bg-muted rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => toggleSelectLead(lead.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{lead.contact_name || 'Sem nome'}</div>
                          <Badge 
                            variant={lead.ai_attended ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {lead.ai_attended ? (
                              <>
                                <Bot className="h-3 w-3" />
                                Atendido IA
                              </>
                            ) : (
                              <>
                                <BotOff className="h-3 w-3" />
                                Sem atendim.
                              </>
                            )}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{lead.contact_phone || '-'}</div>
                          <div className="text-xs text-muted-foreground">{lead.contact_email || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm capitalize">{lead.transaction_type || '-'}</div>
                          {lead.origin_listing_id && (
                            <div className="text-xs text-muted-foreground">#{lead.origin_listing_id}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{lead.portal_origin}</div>
                          {lead.created_at && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(lead.created_at), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            lead.crm_status === 'sent' 
                              ? 'default' 
                              : lead.crm_status === 'error'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {lead.crm_status === 'sent' 
                            ? 'Enviado' 
                            : lead.crm_status === 'error'
                            ? 'Erro'
                            : 'Não'
                          }
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination & Actions */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">Itens por página</span>

            <div className="flex items-center gap-2 ml-4">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Página {page} de {data?.totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= (data?.totalPages || 1)}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={selectedLeads.length === 0 || exportLeads.isPending}
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar
            </Button>
            <Button
              variant="outline"
              disabled={selectedLeads.length === 0 || sendToCRM.isPending}
              onClick={handleSendToCRM}
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar selecionados
            </Button>
            <Button
              variant="outline"
              disabled={selectedLeads.length === 0 || scheduleRemarketing.isPending}
              onClick={handleRemarketing}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Programar Remarketing
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
