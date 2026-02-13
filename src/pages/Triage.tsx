import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, User, Phone, Clock, Home, ShoppingBag, Building2, Megaphone, MessageCircle, Trash2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTriageConversations } from '@/hooks/useTriageConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type DepartmentType = Database['public']['Enums']['department_type'];

const departments: { value: DepartmentType; label: string; icon: typeof Home; color: string }[] = [
  { value: 'locacao', label: 'Locação', icon: Home, color: 'bg-blue-500' },
  { value: 'vendas', label: 'Vendas', icon: ShoppingBag, color: 'bg-green-500' },
  { value: 'administrativo', label: 'Administrativo', icon: Building2, color: 'bg-orange-500' },
  { value: 'marketing', label: 'Marketing', icon: Megaphone, color: 'bg-pink-500' },
];

export default function Triage() {
  const navigate = useNavigate();
  const { conversations, loading, assignDepartment, deleteConversation } = useTriageConversations();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  const handleAssign = async (conversationId: string, department: DepartmentType) => {
    const success = await assignDepartment(conversationId, department);
    if (success) {
      toast.success(`Conversa atribuída ao setor de ${departments.find(d => d.value === department)?.label}`);
    } else {
      toast.error('Erro ao atribuir conversa');
    }
  };

  const handleOpenChat = (phoneNumber: string) => {
    navigate(`/chat/${phoneNumber}`);
  };

  const handleDeleteClick = (conversationId: string) => {
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;
    
    const success = await deleteConversation(conversationToDelete);
    if (success) {
      toast.success('Conversa excluída com sucesso');
    } else {
      toast.error('Erro ao excluir conversa');
    }
    
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Triagem</h1>
              <p className="text-muted-foreground">
                Conversas aguardando atribuição de setor
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="mt-2">
            {conversations.length} conversa{conversations.length !== 1 ? 's' : ''} pendente{conversations.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <Card className="bg-surface-card border-border">
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                Nenhuma conversa aguardando triagem
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-4 pr-4">
              {conversations.map((conversation) => {
                const contactName = conversation.contact?.name || conversation.phone_number;
                const timeAgo = conversation.last_message_at
                  ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })
                  : 'Sem mensagens';

                return (
                  <Card key={conversation.id} className="bg-surface-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleOpenChat(conversation.phone_number)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gold-primary/20 flex items-center justify-center">
                              <User className="h-5 w-5 text-gold-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{contactName}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {conversation.phone_number}
                              </p>
                            </div>
                          </div>

                          {conversation.lastMessage && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2 ml-13">
                              {conversation.lastMessage.body || '[Mídia]'}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-xs text-muted-foreground ml-13">
                            <Clock className="h-3 w-3" />
                            {timeAgo}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted-foreground mb-1">Atribuir para:</p>
                          {departments.map((dept) => (
                            <Button
                              key={dept.value}
                              variant="outline"
                              size="sm"
                              className="justify-start"
                              onClick={() => handleAssign(conversation.id, dept.value)}
                            >
                              <div className={`w-2 h-2 rounded-full ${dept.color} mr-2`} />
                              {dept.label}
                            </Button>
                          ))}
                          <Button
                            variant="outline"
                            size="sm"
                            className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
                            onClick={() => handleDeleteClick(conversation.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Conversa</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita e todas as mensagens serão perdidas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
