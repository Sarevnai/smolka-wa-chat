import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, User, Loader2, Plus } from "lucide-react";
import { useContacts } from "@/hooks/useContacts";
import { useCreateContactList } from "@/hooks/useContactLists";

interface NewContactListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function NewContactListModal({
  open,
  onOpenChange,
  onSuccess,
}: NewContactListModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const createList = useCreateContactList();

  // Filter contacts from marketing department
  const marketingContacts = contacts.filter(c => c.department_code === 'marketing');

  const filteredContacts = marketingContacts.filter(
    (contact) =>
      contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
  );

  const handleContactToggle = (contactId: string) => {
    const newContacts = new Set(selectedContacts);
    if (newContacts.has(contactId)) {
      newContacts.delete(contactId);
    } else {
      newContacts.add(contactId);
    }
    setSelectedContacts(newContacts);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    await createList.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      contact_ids: Array.from(selectedContacts),
    });

    // Reset form
    setName("");
    setDescription("");
    setSelectedContacts(new Set());
    setSearchQuery("");
    
    onOpenChange(false);
    onSuccess?.();
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedContacts(new Set());
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Lista de Contatos
          </DialogTitle>
          <DialogDescription>
            Crie uma lista para organizar seus contatos por região ou categoria
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">Nome da Lista *</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Agronômica, Centro, Jurerê..."
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="list-description">Descrição (opcional)</Label>
            <Textarea
              id="list-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito desta lista..."
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Contact Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contatos</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-auto py-1 px-2 text-xs"
              >
                {selectedContacts.size === filteredContacts.length
                  ? "Desmarcar Todos"
                  : "Selecionar Todos"}
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contatos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[200px] rounded-md border">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum contato encontrado</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleContactToggle(contact.id)}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => handleContactToggle(contact.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contact.name || "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {selectedContacts.size > 0 && (
              <Badge variant="secondary">
                {selectedContacts.size} contato{selectedContacts.size !== 1 ? 's' : ''} selecionado{selectedContacts.size !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || createList.isPending}
          >
            {createList.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Lista"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
