import { useState, useEffect } from "react";
import { Users, Search, Filter, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Contact } from "@/types/contact";
import { useContactsForSelection } from "@/hooks/useContacts";
import { ContactFiltersState } from "@/components/contacts/ContactFilters";
import { cn } from "@/lib/utils";

interface ContactSelectorProps {
  selectedContacts: Set<string>;
  onContactsChange: (contacts: Set<string>) => void;
}

export default function ContactSelector({ selectedContacts, onContactsChange }: ContactSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<ContactFiltersState>({});
  const [showFilters, setShowFilters] = useState(false);

  const { data: contacts = [], isLoading, error } = useContactsForSelection(searchTerm, filters);

  // Apply client-side filtering for hasContracts since it's not server-side filtered
  const filteredContacts = contacts.filter(contact => {
    if (filters.hasContracts === true && (!contact.contracts || contact.contracts.length === 0)) {
      return false;
    }
    if (filters.hasContracts === false && contact.contracts && contact.contracts.length > 0) {
      return false;
    }
    return true;
  });

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      onContactsChange(new Set());
    } else {
      onContactsChange(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleContactToggle = (contactId: string) => {
    const newSelection = new Set(selectedContacts);
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId);
    } else {
      newSelection.add(contactId);
    }
    onContactsChange(newSelection);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm("");
  };

  const hasActiveFilters = 
    searchTerm || 
    filters.status || 
    filters.contactType || 
    filters.rating !== undefined || 
    filters.hasContracts !== undefined;

  const getContactDisplayName = (contact: Contact) => {
    return contact.name || contact.phone;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800 border-green-200';
      case 'inativo': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'bloqueado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'proprietario': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inquilino': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selecionar Contatos
            {selectedContacts.size > 0 && (
              <Badge variant="secondary">
                {selectedContacts.size} selecionados
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Escolha os contatos que receberão a campanha ({filteredContacts.length} disponíveis) 
          <Badge variant="outline" className="ml-2">
            📄 Paginado
          </Badge>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar contatos: {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-4 p-4 bg-muted rounded-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="text-sm font-medium">Status</label>
                 <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value === "all" ? undefined : value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                    <SelectItem value="bloqueado">Bloqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Type Filter */}
              <div>
                <label className="text-sm font-medium">Tipo</label>
                 <Select
                  value={filters.contactType || "all"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, contactType: value === "all" ? undefined : value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="proprietario">Proprietário</SelectItem>
                    <SelectItem value="inquilino">Inquilino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-sm font-medium">Avaliação Mín.</label>
                 <Select
                  value={filters.rating?.toString() || "any"}
                  onValueChange={(value) =>
                    setFilters({ ...filters, rating: value === "any" ? undefined : parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer</SelectItem>
                    <SelectItem value="1">1⭐</SelectItem>
                    <SelectItem value="2">2⭐</SelectItem>
                    <SelectItem value="3">3⭐</SelectItem>
                    <SelectItem value="4">4⭐</SelectItem>
                    <SelectItem value="5">5⭐</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Has Contracts Filter */}
              <div>
                <label className="text-sm font-medium">Contratos</label>
                 <Select
                  value={filters.hasContracts?.toString() || "all"}
                  onValueChange={(value) =>
                    setFilters({ 
                      ...filters, 
                      hasContracts: value === "all" ? undefined : value === "true"
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="true">Com contratos</SelectItem>
                    <SelectItem value="false">Sem contratos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Select All */}
        {filteredContacts.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedContacts.size === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Selecionar todos ({filteredContacts.length})
              </label>
            </div>
            
            <Badge variant="outline">
              {selectedContacts.size} de {filteredContacts.length} selecionados
            </Badge>
          </div>
        )}

        {/* Contacts List */}
        <ScrollArea className="h-64 w-full border rounded-md">
          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Carregando todos os contatos...</p>
                <p className="text-xs">Usando paginação para carregar até 2000 contatos</p>
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum contato encontrado.
              </div>
            ) : (
              filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-md border transition-colors cursor-pointer hover:bg-accent",
                    selectedContacts.has(contact.id) && "bg-primary/5 border-primary"
                  )}
                  onClick={() => handleContactToggle(contact.id)}
                >
                  <Checkbox
                    checked={selectedContacts.has(contact.id)}
                    onCheckedChange={() => handleContactToggle(contact.id)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">
                        {getContactDisplayName(contact)}
                      </p>
                      
                      <Badge className={cn("text-xs", getStatusColor(contact.status))}>
                        {contact.status}
                      </Badge>
                      
                      {contact.contact_type && (
                        <Badge className={cn("text-xs", getTypeColor(contact.contact_type))}>
                          {contact.contact_type === 'proprietario' ? 'Proprietário' : 'Inquilino'}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{contact.phone}</span>
                      {contact.email && (
                        <>
                          <span>•</span>
                          <span>{contact.email}</span>
                        </>
                      )}
                      {contact.rating && (
                        <>
                          <span>•</span>
                          <span>{'⭐'.repeat(contact.rating)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedContacts.has(contact.id) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}