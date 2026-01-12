import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Users, ListChecks, Search, User, FolderOpen } from "lucide-react";
import { useContactLists, ContactList } from "@/hooks/useContactLists";
import { useContacts } from "@/hooks/useContacts";
import { cn } from "@/lib/utils";

interface StepContactsProps {
  selectedListId: string | null;
  selectedContacts: Set<string>;
  selectionMode: 'list' | 'individual';
  onSelectionModeChange: (mode: 'list' | 'individual') => void;
  onListSelect: (listId: string | null) => void;
  onContactsChange: (contacts: Set<string>) => void;
}

export default function StepContacts({
  selectedListId,
  selectedContacts,
  selectionMode,
  onSelectionModeChange,
  onListSelect,
  onContactsChange,
}: StepContactsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: lists = [], isLoading: listsLoading } = useContactLists();
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();

  // Filter contacts from marketing department
  const marketingContacts = contacts.filter(c => c.department_code === 'marketing');

  const filteredContacts = marketingContacts.filter(
    (contact) =>
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
  );

  const handleListSelect = (listId: string) => {
    if (selectedListId === listId) {
      onListSelect(null);
      onContactsChange(new Set());
    } else {
      onListSelect(listId);
      const list = lists.find(l => l.id === listId);
      if (list) {
        onContactsChange(new Set(list.contact_ids));
      }
    }
  };

  const handleContactToggle = (contactId: string) => {
    const newContacts = new Set(selectedContacts);
    if (newContacts.has(contactId)) {
      newContacts.delete(contactId);
    } else {
      newContacts.add(contactId);
    }
    onContactsChange(newContacts);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      onContactsChange(new Set());
    } else {
      onContactsChange(new Set(filteredContacts.map(c => c.id)));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold">Selecione os Destinatários</h2>
        <p className="text-muted-foreground mt-1">
          Escolha uma lista de contatos ou selecione individualmente
        </p>
      </div>

      {/* Selection Mode */}
      <Card>
        <CardContent className="pt-6">
          <RadioGroup
            value={selectionMode}
            onValueChange={(v) => {
              onSelectionModeChange(v as 'list' | 'individual');
              onListSelect(null);
              onContactsChange(new Set());
            }}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="mode-list"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                selectionMode === 'list'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="list" id="mode-list" />
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Usar Lista</p>
                  <p className="text-xs text-muted-foreground">Selecione uma lista pré-definida</p>
                </div>
              </div>
            </Label>

            <Label
              htmlFor="mode-individual"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                selectionMode === 'individual'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="individual" id="mode-individual" />
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Seleção Manual</p>
                  <p className="text-xs text-muted-foreground">Escolha contatos um a um</p>
                </div>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* List Selection */}
      {selectionMode === 'list' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Listas de Contatos
            </CardTitle>
            <CardDescription>
              Selecione uma lista para enviar a campanha
            </CardDescription>
          </CardHeader>
          <CardContent>
            {listsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : lists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhuma lista criada ainda</p>
                <p className="text-sm mt-1">
                  Crie listas na aba "Listas" para usá-las aqui
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {lists.map((list) => (
                  <div
                    key={list.id}
                    onClick={() => handleListSelect(list.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 cursor-pointer transition-all",
                      selectedListId === list.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{list.name}</p>
                        {list.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {list.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {list.contact_ids.length} contatos
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Individual Selection */}
      {selectionMode === 'individual' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Contatos do Marketing
                </CardTitle>
                <CardDescription>
                  {selectedContacts.size} de {marketingContacts.length} selecionados
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedContacts.size === filteredContacts.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] rounded-md border">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum contato encontrado</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleContactToggle(contact.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                        selectedContacts.has(contact.id)
                          ? "bg-primary/10"
                          : "hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => handleContactToggle(contact.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {contact.name || "Sem nome"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {contact.phone}
                        </p>
                      </div>
                      {contact.status && (
                        <Badge variant="outline" className="text-xs">
                          {contact.status}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {selectedContacts.size > 0 && (
        <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-700 dark:text-green-300">
            {selectedContacts.size} contato{selectedContacts.size !== 1 ? 's' : ''} selecionado{selectedContacts.size !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
