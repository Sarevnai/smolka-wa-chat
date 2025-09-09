import { useState, useEffect } from "react";
import { Search, Filter, RefreshCw, Clock, Phone, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabaseClient";
import { fetchMessages, MessageRow, Period } from "@/lib/messages";
import { cn } from "@/lib/utils";

// Period mapping for display labels
const periodLabels: Record<Period, string> = {
  "today": "Hoje",
  "7d": "7 dias", 
  "30d": "30 dias",
  "all": "Tudo"
};

export default function Inbox() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchPhone, setSearchPhone] = useState("");
  const [periodFilter, setPeriodFilter] = useState<Period>("all");
  const { toast } = useToast();

  // Fetch messages using the new fetchMessages function
  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await fetchMessages({
        q: searchPhone,
        period: periodFilter,
        limit: 100
      });
      setMessages(data);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Erro ao carregar mensagens",
        description: "Não foi possível carregar as mensagens. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Setup realtime subscription
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;
          
          // Check if the new message matches current filters
          const matchesPhone = !searchPhone.trim() || 
            newMessage.wa_from?.toLowerCase().includes(searchPhone.trim().toLowerCase());
          
          let matchesPeriod = true;
          if (periodFilter !== "all") {
            const messageDate = new Date(newMessage.created_at || new Date());
            const now = new Date();
            
            switch (periodFilter) {
              case "today":
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                matchesPeriod = messageDate >= today;
                break;
              case "7d":
                const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesPeriod = messageDate >= week;
                break;
              case "30d":
                const month = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesPeriod = messageDate >= month;
                break;
            }
          }

          if (matchesPhone && matchesPeriod) {
            setMessages((prev) => [newMessage, ...prev]);
            
            // Show toast for new message
            toast({
              title: "Nova mensagem recebida",
              description: `De: ${newMessage.wa_from || "Desconhecido"}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchPhone, periodFilter, toast]);

  const clearFilters = () => {
    setSearchPhone("");
    setPeriodFilter("all");
  };

  const formatMessageDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "Data inválida";
    }
  };

  const truncateMessage = (text: string, maxLength: number = 100) => {
    if (!text) return "Sem conteúdo";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Inbox</h1>
            <p className="text-muted-foreground">
              {messages.length} mensagens encontradas
            </p>
          </div>
          <Button onClick={loadMessages} disabled={loading} variant="outline">
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número (wa_from)"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as Period)}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{periodLabels.today}</SelectItem>
                  <SelectItem value="7d">{periodLabels["7d"]}</SelectItem>
                  <SelectItem value="30d">{periodLabels["30d"]}</SelectItem>
                  <SelectItem value="all">{periodLabels.all}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={clearFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Messages List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Sem mensagens ainda
              </p>
              <p className="text-sm text-muted-foreground text-center">
                As mensagens aparecerão aqui quando forem recebidas ou enviadas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {message.wa_from || "Número desconhecido"}
                        </p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatMessageDate(message.wa_timestamp || message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={message.direction === "inbound" ? "default" : "secondary"}
                      className={cn(
                        message.direction === "inbound" 
                          ? "bg-inbound/10 text-inbound border-inbound/20" 
                          : "bg-outbound/10 text-outbound border-outbound/20"
                      )}
                    >
                      {message.direction === "inbound" ? "Recebida" : "Enviada"}
                    </Badge>
                  </div>
                  <p className="text-foreground leading-relaxed">
                    {truncateMessage(message.body || "")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}