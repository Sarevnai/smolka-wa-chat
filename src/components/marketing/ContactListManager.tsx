import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { 
  FolderOpen, 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit, 
  Users,
  Loader2
} from "lucide-react";
import { useContactLists, useDeleteContactList, ContactList } from "@/hooks/useContactLists";
import NewContactListModal from "./NewContactListModal";
import EditContactListModal from "./EditContactListModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ContactListManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingList, setEditingList] = useState<ContactList | null>(null);
  const [deletingList, setDeletingList] = useState<ContactList | null>(null);

  const { data: lists = [], isLoading, refetch } = useContactLists();
  const deleteList = useDeleteContactList();

  const filteredLists = lists.filter(
    (list) =>
      list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deletingList) return;
    
    await deleteList.mutateAsync(deletingList.id);
    setDeletingList(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Listas de Contatos
              </CardTitle>
              <CardDescription>
                Organize seus contatos em listas para campanhas em massa
              </CardDescription>
            </div>
            <Button onClick={() => setShowNewModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Lista
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar listas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Lists */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLists.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              {lists.length === 0 ? (
                <>
                  <p className="text-lg font-medium">Nenhuma lista criada</p>
                  <p className="text-sm mt-1">
                    Crie sua primeira lista para organizar contatos
                  </p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setShowNewModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Lista
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium">Nenhuma lista encontrada</p>
                  <p className="text-sm mt-1">
                    Tente outro termo de busca
                  </p>
                </>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLists.map((list) => (
                  <Card 
                    key={list.id} 
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{list.name}</h3>
                          {list.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {list.description}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingList(list)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingList(list)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {list.contact_ids.length} contatos
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mt-3">
                        Criada em {format(new Date(list.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* New List Modal */}
      <NewContactListModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={() => refetch()}
      />

      {/* Edit List Modal */}
      {editingList && (
        <EditContactListModal
          open={!!editingList}
          onOpenChange={(open) => !open && setEditingList(null)}
          list={editingList}
          onSuccess={() => {
            refetch();
            setEditingList(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingList} onOpenChange={(open) => !open && setDeletingList(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lista?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a lista "{deletingList?.name}"? 
              Esta ação não pode ser desfeita. Os contatos não serão excluídos, apenas a lista.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteList.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
