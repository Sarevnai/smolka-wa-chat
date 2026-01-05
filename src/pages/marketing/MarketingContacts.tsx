import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, Plus, Search, Filter, Tag, Download, Upload,
  ArrowLeft, MoreHorizontal, Phone, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Layout from "@/components/Layout";
import { TagManager } from "@/components/marketing/TagManager";
import { TagSelector } from "@/components/marketing/TagSelector";
import { ImportMarketingContactsModal } from "@/components/marketing/ImportMarketingContactsModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useContactTags, useContactsTagAssignments } from "@/hooks/useContactTags";

type ContactType = "lead" | "prospect" | "engajado" | "campanha" | "all";

export default function MarketingContacts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ContactType>("all");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("contacts");
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { data: allTags = [] } = useContactTags("marketing");

  // Fetch marketing contacts
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["marketing-contacts", searchQuery, typeFilter],
    queryFn: async () => {
      let query = supabase
        .from("contacts")
        .select("*")
        .eq("department_code", "marketing")
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      }

      if (typeFilter !== "all") {
        query = query.eq("contact_type", typeFilter);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data;
    },
  });

  const contactIds = useMemo(() => contacts.map(c => c.id), [contacts]);
  const { data: tagAssignments = {} } = useContactsTagAssignments(contactIds);

  // Filter by selected tags
  const filteredContacts = useMemo(() => {
    if (selectedTags.length === 0) return contacts;
    
    return contacts.filter(contact => {
      const contactTags = tagAssignments[contact.id] || [];
      return selectedTags.every(tagId => 
        contactTags.some(t => t.id === tagId)
      );
    });
  }, [contacts, selectedTags, tagAssignments]);

  const getTypeBadge = (type: string | null) => {
    const styles: Record<string, string> = {
      lead: "bg-pink-100 text-pink-800 border-pink-200",
      prospect: "bg-purple-100 text-purple-800 border-purple-200",
      engajado: "bg-orange-100 text-orange-800 border-orange-200",
      campanha: "bg-green-100 text-green-800 border-green-200",
    };
    return (
      <Badge variant="outline" className={styles[type || ""] || "bg-gray-100"}>
        {type || "N/A"}
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/marketing")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-8 w-8 text-pink-500" />
                Contatos Marketing
              </h1>
              <p className="text-muted-foreground mt-1">
                {filteredContacts.length} contatos encontrados
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
            <Button className="bg-pink-500 hover:bg-pink-600">
              <Plus className="h-4 w-4 mr-2" />
              Novo Contato
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="contacts">
              <Users className="h-4 w-4 mr-2" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="tags">
              <Tag className="h-4 w-4 mr-2" />
              Gerenciar Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, telefone ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ContactType)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tipo de contato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="engajado">Engajado</SelectItem>
                      <SelectItem value="campanha">Campanha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tag filters */}
                {allTags.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Filtrar por tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            setSelectedTags(prev =>
                              prev.includes(tag.id)
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            selectedTags.includes(tag.id)
                              ? "ring-2 ring-offset-1 ring-primary"
                              : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ 
                            backgroundColor: tag.color + "20", 
                            color: tag.color,
                            borderColor: tag.color 
                          }}
                        >
                          {tag.name}
                        </button>
                      ))}
                      {selectedTags.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedTags([])}
                          className="text-xs"
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts List */}
            <Card>
              <ScrollArea className="h-[600px]">
                <div className="divide-y">
                  {isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Carregando contatos...
                    </div>
                  ) : filteredContacts.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhum contato encontrado
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium truncate">
                                {contact.name || "Sem nome"}
                              </p>
                              {getTypeBadge(contact.contact_type)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {contact.phone}
                              </span>
                              {contact.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                              )}
                            </div>
                            <div className="mt-2">
                              <TagSelector 
                                contactId={contact.id} 
                                departmentCode="marketing"
                                compact 
                              />
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/chat/${contact.phone}`)}>
                                Abrir Conversa
                              </DropdownMenuItem>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Adicionar a Campanha</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="tags" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Tags</CardTitle>
                <CardDescription>
                  Crie e organize tags para categorizar seus contatos de marketing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TagManager departmentCode="marketing" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <ImportMarketingContactsModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ["marketing-contacts"] });
          }}
        />
      </div>
    </Layout>
  );
}
