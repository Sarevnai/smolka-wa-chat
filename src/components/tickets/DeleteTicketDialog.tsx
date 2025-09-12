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
import { useDeleteTicket, type Ticket } from "@/hooks/useTickets";
import { useState } from "react";

interface DeleteTicketDialogProps {
  ticket: Ticket;
  children?: React.ReactNode;
  onDeleted?: () => void;
}

export function DeleteTicketDialog({ ticket, children, onDeleted }: DeleteTicketDialogProps) {
  const deleteTicket = useDeleteTicket();
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteTicket.mutateAsync(ticket.id);
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      // handled in hook
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Excluir ticket"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir ticket?</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o ticket <strong>#{ticket.id.slice(0, 8)}</strong>?
            <br />
            <br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteTicket.isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteTicket.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteTicket.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
