import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Trash2, AlertTriangle, Info } from "lucide-react";
import { useDeleteContactAdvanced, type ContactDeletionCounts } from "@/hooks/useDeleteContactAdvanced";
import { Contact } from "@/types/contact";
import { useState, useEffect } from "react";

interface DeleteContactDialogProps {
  contact: Contact;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteContactDialog({ contact, children, open, onOpenChange }: DeleteContactDialogProps) {
  const { deleteContact, isDeleting, getContactCounts } = useDeleteContactAdvanced();
  const [counts, setCounts] = useState<ContactDeletionCounts>({ tickets: 0, contracts: 0, messages: 0 });
  const [ticketOption, setTicketOption] = useState<'detach' | 'delete'>('detach');
  const [purgeMessages, setPurgeMessages] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load counts when dialog opens
  useEffect(() => {
    if (open && contact.id) {
      setLoading(true);
      getContactCounts(contact.id, contact.phone)
        .then(setCounts)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open, contact.id, contact.phone, getContactCounts]);

  const handleDelete = async () => {
    try {
      await deleteContact({
        contactId: contact.id,
        phoneNumber: contact.phone,
        options: {
          detachTickets: ticketOption === 'detach',
          deleteTickets: ticketOption === 'delete',
          purgeMessages
        }
      });
      onOpenChange?.(false);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Dialog delete error:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Excluir contato?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Tem certeza que deseja excluir o contato{" "}
                <strong>{contact.name || contact.phone}</strong>?
              </p>

              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>Verificando dependências...</span>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Itens encontrados:</span>
                  </div>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• {counts.tickets} ticket(s) associado(s)</li>
                    <li>• {counts.contracts} contrato(s) associado(s)</li>
                    <li>• {counts.messages} mensagem(ns) no histórico</li>
                  </ul>

                  {counts.tickets > 0 && (
                    <div className="space-y-3 pt-2 border-t">
                      <Label className="text-sm font-medium">O que fazer com os tickets?</Label>
                      <RadioGroup 
                        value={ticketOption} 
                        onValueChange={(value: 'detach' | 'delete') => setTicketOption(value)}
                        className="space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="detach" id="detach" />
                          <Label htmlFor="detach" className="text-sm">
                            Desvincular tickets (recomendado) - Remove a ligação mas mantém os tickets
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="delete" id="delete" />
                          <Label htmlFor="delete" className="text-sm text-destructive">
                            Excluir tickets também - Remove permanentemente todos os tickets
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  {counts.messages > 0 && (
                    <div className="flex items-center space-x-2 pt-2 border-t">
                      <Checkbox 
                        id="purge-messages" 
                        checked={purgeMessages}
                        onCheckedChange={(checked) => setPurgeMessages(checked === true)}
                      />
                      <Label htmlFor="purge-messages" className="text-sm">
                        Excluir também o histórico de mensagens ({counts.messages} mensagem(ns))
                      </Label>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-destructive font-medium">
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Excluindo..." : "Excluir contato"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}