import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageRow } from "@/lib/messages";

interface DeleteMessageConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: MessageRow | null;
  deletionType: 'for_me' | 'for_everyone';
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteMessageConfirmation({
  open,
  onOpenChange,
  message,
  deletionType,
  onConfirm,
  isDeleting,
}: DeleteMessageConfirmationProps) {
  if (!message) return null;

  const isForEveryone = deletionType === 'for_everyone';
  const isOutbound = message.direction === 'outbound';

  const getTitle = () => {
    if (isForEveryone) {
      return "Excluir mensagem para todos?";
    }
    return "Excluir mensagem para você?";
  };

  const getDescription = () => {
    if (isForEveryone) {
      return "Esta mensagem será removida para todos os participantes da conversa. Esta ação não pode ser desfeita.";
    }
    return "Esta mensagem será removida apenas da sua visualização. Os outros participantes ainda poderão vê-la.";
  };

  const getConfirmText = () => {
    if (isForEveryone) {
      return isDeleting ? "Excluindo para todos..." : "Excluir para todos";
    }
    return isDeleting ? "Excluindo para mim..." : "Excluir para mim";
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
            
            {message.body && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">Mensagem:</p>
                <p className="text-sm mt-1 line-clamp-3">{message.body}</p>
              </div>
            )}
            
            {message.media_type && message.media_type !== 'text' && (
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Mídia: {message.media_type}
                  {message.media_filename && ` - ${message.media_filename}`}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {getConfirmText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}