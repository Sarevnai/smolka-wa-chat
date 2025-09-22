import { useState } from "react";
import { Forward, Search, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageRow } from "@/lib/messages";
import { useContacts } from "@/hooks/useContacts";
import { cn } from "@/lib/utils";

interface MessageForwardProps {
  isOpen: boolean;
  onClose: () => void;
  message: MessageRow;
  onForward: (selectedContacts: string[], message: MessageRow) => void;
}

export function MessageForward({ isOpen, onClose, message, onForward }: MessageForwardProps) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: contacts = [] } = useContacts();

  const filteredContacts = contacts.filter(contact => 
    contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone.includes(searchQuery)
  );

  const handleContactToggle = (phone: string) => {
    setSelectedContacts(prev => 
      prev.includes(phone) 
        ? prev.filter(p => p !== phone)
        : [...prev, phone]
    );
  };

  const handleForward = () => {
    if (selectedContacts.length === 0) return;
    
    onForward(selectedContacts, message);
    onClose();
    setSelectedContacts([]);
    setSearchQuery("");
  };

  const handleClose = () => {
    onClose();
    setSelectedContacts([]);
    setSearchQuery("");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-4 w-4" />
            Encaminhar mensagem
          </DialogTitle>
        </DialogHeader>

        {/* Message preview */}
        <div className="border rounded-lg p-3 bg-muted/50">
          <div className="text-sm text-muted-foreground mb-2">Mensagem selecionada:</div>
          <div className="text-sm line-clamp-3">
            {message.body || (message.media_type && "Arquivo anexado") || "Mensagem"}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Contact list */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filteredContacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Nenhum contato encontrado
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isSelected = selectedContacts.includes(contact.phone);
              const displayName = contact.name || contact.phone;
              const initials = contact.name 
                ? contact.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                : contact.phone.slice(-2);

              return (
                <div
                  key={contact.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                  )}
                  onClick={() => handleContactToggle(contact.phone)}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleContactToggle(contact.phone)}
                  />
                  
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {displayName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {contact.phone}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedContacts.length} contato(s) selecionado(s)
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button 
              onClick={handleForward}
              disabled={selectedContacts.length === 0}
            >
              <Forward className="h-4 w-4 mr-2" />
              Encaminhar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}