import { useState } from "react";
import { Plus, Pencil, Trash2, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { 
  useContactTags, 
  useCreateTag, 
  useUpdateTag, 
  useDeleteTag,
  useTagCounts,
  ContactTag 
} from "@/hooks/useContactTags";

type DepartmentType = Database["public"]["Enums"]["department_type"];

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

interface TagManagerProps {
  departmentCode?: DepartmentType;
}

export function TagManager({ departmentCode = "marketing" }: TagManagerProps) {
  const { data: tags = [], isLoading } = useContactTags(departmentCode);
  const { data: tagCounts = {} } = useTagCounts(departmentCode);
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ContactTag | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const handleCreate = async () => {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({
      name: newTagName.trim(),
      color: newTagColor,
      departmentCode,
    });
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
    setIsCreateOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingTag || !newTagName.trim()) return;
    await updateTag.mutateAsync({
      id: editingTag.id,
      name: newTagName.trim(),
      color: newTagColor,
    });
    setEditingTag(null);
    setNewTagName("");
    setNewTagColor(TAG_COLORS[0]);
  };

  const handleDelete = async (id: string) => {
    await deleteTag.mutateAsync(id);
  };

  const openEdit = (tag: ContactTag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setNewTagColor(tag.color);
  };

  if (isLoading) {
    return <div className="animate-pulse text-muted-foreground">Carregando tags...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TagIcon className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Tags ({tags.length})</h3>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Tag</DialogTitle>
              <DialogDescription>
                Crie uma tag para organizar seus contatos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nome da Tag</label>
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Ex: VIP, Interessado, Quente..."
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cor</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newTagColor === color
                          ? "ring-2 ring-offset-2 ring-primary scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">Preview:</span>
                <Badge style={{ backgroundColor: newTagColor, color: "white" }}>
                  {newTagName || "Nome da tag"}
                </Badge>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!newTagName.trim() || createTag.isPending}>
                {createTag.isPending ? "Criando..." : "Criar Tag"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tags List */}
      <div className="grid gap-2">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma tag criada ainda. Crie sua primeira tag!
          </p>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 bg-card border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Badge style={{ backgroundColor: tag.color, color: "white" }}>
                  {tag.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {tagCounts[tag.id] || 0} contatos
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Dialog open={editingTag?.id === tag.id} onOpenChange={(open) => !open && setEditingTag(null)}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tag)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Tag</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium">Nome da Tag</label>
                        <Input
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Cor</label>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {TAG_COLORS.map((color) => (
                            <button
                              key={color}
                              onClick={() => setNewTagColor(color)}
                              className={`w-8 h-8 rounded-full transition-all ${
                                newTagColor === color
                                  ? "ring-2 ring-offset-2 ring-primary scale-110"
                                  : "hover:scale-105"
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditingTag(null)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleUpdate} disabled={updateTag.isPending}>
                        {updateTag.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir a tag "{tag.name}"?
                        Esta ação removerá a tag de todos os contatos.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(tag.id)}
                        className="bg-destructive text-destructive-foreground"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
