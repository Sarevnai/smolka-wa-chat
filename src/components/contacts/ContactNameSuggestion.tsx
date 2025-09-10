import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckIcon, XIcon, UserIcon } from "lucide-react";
import { useUpdateContact } from "@/hooks/useContacts";
import { toast } from "sonner";

interface ContactNameSuggestionProps {
  contact: {
    id: string;
    name?: string;
    phone: string;
  };
  suggestedName?: string;
  onDismiss: () => void;
  onAccept: () => void;
}

export function ContactNameSuggestion({ 
  contact, 
  suggestedName, 
  onDismiss, 
  onAccept 
}: ContactNameSuggestionProps) {
  const [customName, setCustomName] = useState(suggestedName || "");
  const [isEditing, setIsEditing] = useState(false);
  const updateContact = useUpdateContact();

  const handleAcceptSuggestion = async () => {
    try {
      await updateContact.mutateAsync({
        contactId: contact.id,
        updates: { name: suggestedName }
      });
      
      toast.success(`Nome atualizado para ${suggestedName}`);
      onAccept();
    } catch (error) {
      toast.error("Erro ao atualizar nome do contato");
    }
  };

  const handleCustomName = async () => {
    if (!customName.trim()) return;
    
    try {
      await updateContact.mutateAsync({
        contactId: contact.id,
        updates: { name: customName.trim() }
      });
      
      toast.success(`Nome atualizado para ${customName.trim()}`);
      onAccept();
    } catch (error) {
      toast.error("Erro ao atualizar nome do contato");
    }
  };

  if (!suggestedName) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Nome detectado automaticamente</CardTitle>
          <Badge variant="secondary" className="text-xs">
            Auto
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Detectamos um possível nome nas mensagens de {contact.phone}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0">
        {!isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Nome sugerido:</span>
              <Badge variant="outline" className="font-medium">
                {suggestedName}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAcceptSuggestion}
                disabled={updateContact.isPending}
                className="h-8"
              >
                <CheckIcon className="h-3 w-3 mr-1" />
                Aceitar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-8"
              >
                Editar
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={onDismiss}
                className="h-8"
              >
                <XIcon className="h-3 w-3 mr-1" />
                Ignorar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="custom-name" className="text-xs">
                Nome personalizado
              </Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Digite o nome correto"
                className="h-8 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomName();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                autoFocus
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCustomName}
                disabled={updateContact.isPending || !customName.trim()}
                className="h-8"
              >
                <CheckIcon className="h-3 w-3 mr-1" />
                Salvar
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="h-8"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}