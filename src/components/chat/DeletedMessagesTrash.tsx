import { useState, useEffect } from 'react';
import { useDeleteMessage } from '@/hooks/useDeleteMessage';
import { DeletedMessageBubble } from './DeletedMessageBubble';
import { Button } from '@/components/ui/button';
import { Trash2, RotateCcw, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';

interface DeletedMessagesTrashProps {
  children: React.ReactNode;
}

export function DeletedMessagesTrash({ children }: DeletedMessagesTrashProps) {
  const { getDeletedMessages, restoreMessage, isDeleting } = useDeleteMessage();
  const [deletedMessages, setDeletedMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadDeletedMessages = async () => {
    setLoading(true);
    try {
      const messages = await getDeletedMessages();
      setDeletedMessages(messages);
    } catch (error) {
      console.error('Error loading deleted messages:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDeletedMessages();
    }
  }, [open]);

  const handleRestore = async (deletedMessageId: string) => {
    const result = await restoreMessage(deletedMessageId);
    if (result.success) {
      // Remove from local state
      setDeletedMessages(prev => prev.filter(msg => msg.id !== deletedMessageId));
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Mensagens Excluídas
            {deletedMessages.length > 0 && (
              <Badge variant="secondary">{deletedMessages.length}</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Mensagens que você excluiu. Clique no botão de restaurar para trazê-las de volta.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Carregando mensagens excluídas...
            </div>
          )}

          {!loading && deletedMessages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma mensagem excluída</p>
              <p className="text-sm">
                Mensagens que você excluir aparecerão aqui e poderão ser restauradas.
              </p>
            </div>
          )}

          {!loading && deletedMessages.map((deletedMessage) => (
            <DeletedMessageBubble
              key={deletedMessage.id}
              message={{
                ...deletedMessage.original_message_data,
                id: deletedMessage.message_id,
              }}
              isDeleted={true}
              deletionType={deletedMessage.deletion_type}
              onRestore={() => handleRestore(deletedMessage.id)}
              isRestoring={isDeleting}
            />
          ))}
        </div>

        {deletedMessages.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDeletedMessages}
              disabled={loading}
              className="w-full"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar lista
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}