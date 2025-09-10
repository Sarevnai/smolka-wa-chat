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
import { Trash2 } from "lucide-react";
import { useDeleteContact } from "@/hooks/useContacts";
import { useToast } from "@/hooks/use-toast";
import { Contact } from "@/types/contact";

interface DeleteContactDialogProps {
  contact: Contact;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DeleteContactDialog({ contact, children, open, onOpenChange }: DeleteContactDialogProps) {
  const deleteContact = useDeleteContact();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(contact.id);
      toast({
        title: "Contato excluído",
        description: `${contact.name || contact.phone} foi excluído com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao excluir contato",
        description: "Ocorreu um erro ao tentar excluir o contato. Tente novamente.",
        variant: "destructive",
      });
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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o contato{" "}
            <strong>{contact.name || contact.phone}</strong>?
            <br />
            <br />
            Esta ação irá:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Remover o contato permanentemente</li>
              <li>Excluir todos os contratos associados</li>
              <li>Manter o histórico de mensagens (mas sem vincular ao contato)</li>
            </ul>
            <br />
            <strong>Esta ação não pode ser desfeita.</strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteContact.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteContact.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}