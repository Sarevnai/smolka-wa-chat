import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Lock,
  MessageSquare,
  User,
  MapPin,
  Home,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useUpdateEssentialQuestions } from "@/hooks/useAIBehavior";
import type { EssentialQuestion, QuestionCategory } from "@/types/ai-behavior";

interface EditEssentialQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  questions: EssentialQuestion[];
}

const categoryOptions: { value: QuestionCategory; label: string; icon: React.ReactNode }[] = [
  { value: "operation", label: "Operação", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "lead_info", label: "Info Lead", icon: <User className="h-4 w-4" /> },
  { value: "location", label: "Localização", icon: <MapPin className="h-4 w-4" /> },
  { value: "property", label: "Caract. Imóvel", icon: <Home className="h-4 w-4" /> },
];

export function EditEssentialQuestionsModal({
  open,
  onOpenChange,
  configId,
  questions,
}: EditEssentialQuestionsModalProps) {
  const [localQuestions, setLocalQuestions] = useState<EssentialQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCategory, setNewCategory] = useState<QuestionCategory>("lead_info");
  const updateQuestions = useUpdateEssentialQuestions();

  useEffect(() => {
    if (open) {
      setLocalQuestions([...questions]);
    }
  }, [open, questions]);

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;

    const newQ: EssentialQuestion = {
      id: `q_${Date.now()}`,
      question: newQuestion.trim(),
      category: newCategory,
      isQualifying: false,
      isLocked: false,
      order: localQuestions.length,
      enabled: true,
    };

    setLocalQuestions([...localQuestions, newQ]);
    setNewQuestion("");
    setNewCategory("lead_info");
  };

  const handleRemoveQuestion = (id: string) => {
    setLocalQuestions(localQuestions.filter((q) => q.id !== id));
  };

  const handleToggleEnabled = (id: string) => {
    setLocalQuestions(
      localQuestions.map((q) =>
        q.id === id && !q.isLocked ? { ...q, enabled: !q.enabled } : q
      )
    );
  };

  const handleToggleQualifying = (id: string) => {
    setLocalQuestions(
      localQuestions.map((q) =>
        q.id === id ? { ...q, isQualifying: !q.isQualifying } : q
      )
    );
  };

  const handleUpdateCategory = (id: string, category: QuestionCategory) => {
    setLocalQuestions(
      localQuestions.map((q) =>
        q.id === id ? { ...q, category } : q
      )
    );
  };

  const handleUpdateQuestion = (id: string, question: string) => {
    setLocalQuestions(
      localQuestions.map((q) =>
        q.id === id && !q.isLocked ? { ...q, question } : q
      )
    );
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    const updated = [...localQuestions];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    setLocalQuestions(updated.map((q, i) => ({ ...q, order: i })));
  };

  const handleSave = () => {
    updateQuestions.mutate(
      { configId, questions: localQuestions },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Perguntas Essenciais</DialogTitle>
          <DialogDescription>
            Configure as perguntas que a IA fará durante a qualificação do lead
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {localQuestions.map((q, index) => (
              <div
                key={q.id}
                className="flex items-start gap-2 p-3 rounded-lg border bg-card"
              >
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 cursor-grab"
                    onClick={() => index > 0 && moveQuestion(index, index - 1)}
                    disabled={index === 0}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {q.isLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                    <Input
                      value={q.question}
                      onChange={(e) => handleUpdateQuestion(q.id, e.target.value)}
                      disabled={q.isLocked}
                      className="flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Select
                      value={q.category}
                      onValueChange={(v) => handleUpdateCategory(q.id, v as QuestionCategory)}
                    >
                      <SelectTrigger className="w-[160px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              {cat.icon}
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.enabled}
                        onCheckedChange={() => handleToggleEnabled(q.id)}
                        disabled={q.isLocked}
                      />
                      <Label className="text-sm">Ativa</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={q.isQualifying}
                        onCheckedChange={() => handleToggleQualifying(q.id)}
                      />
                      <Label className="text-sm flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Qualificadora
                      </Label>
                    </div>
                  </div>
                </div>

                {!q.isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleRemoveQuestion(q.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Add New Question */}
        <div className="space-y-3 pt-4 border-t">
          <Label>Adicionar Nova Pergunta</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Digite a pergunta..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              className="flex-1"
            />
            <Select
              value={newCategory}
              onValueChange={(v) => setNewCategory(v as QuestionCategory)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddQuestion} disabled={!newQuestion.trim()}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateQuestions.isPending}>
            {updateQuestions.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
