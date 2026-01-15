import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HelpCircle,
  AlertTriangle,
  ArrowUpRight,
  Target,
  Trash2,
  Plus,
  Loader2,
  Save,
  Lightbulb,
} from "lucide-react";
import type { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";

interface AIQualificationTabProps {
  config: AIAgentConfig;
  updateConfig: (updates: Partial<AIAgentConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
}

interface QuestionSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  questions: string[];
  onAdd: (question: string) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, value: string) => void;
}

function QuestionSection({
  title,
  description,
  icon,
  color,
  questions,
  onAdd,
  onRemove,
  onUpdate,
}: QuestionSectionProps) {
  const [newQuestion, setNewQuestion] = useState("");

  const handleAdd = () => {
    if (!newQuestion.trim()) return;
    onAdd(newQuestion.trim());
    setNewQuestion("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-lg ${color}`}>
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.map((q, index) => (
          <div key={index} className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0">
              {index + 1}
            </Badge>
            <Input
              value={q}
              onChange={(e) => onUpdate(index, e.target.value)}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive shrink-0"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Input
            placeholder="Adicionar nova pergunta..."
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} disabled={!newQuestion.trim()} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function AIQualificationTab({
  config,
  updateConfig,
  saveConfig,
  isSaving,
}: AIQualificationTabProps) {
  const [newCriteria, setNewCriteria] = useState("");

  const addCriteria = () => {
    if (!newCriteria.trim()) return;
    updateConfig({
      escalation_criteria: [...config.escalation_criteria, newCriteria.trim()],
    });
    setNewCriteria("");
  };

  const removeCriteria = (index: number) => {
    updateConfig({
      escalation_criteria: config.escalation_criteria.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* SPIN Enable Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold">Qualificação SPIN Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Usar metodologia SPIN Selling para qualificar leads
              </p>
            </div>
            <Switch
              checked={config.spin_enabled}
              onCheckedChange={(checked) => updateConfig({ spin_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {!config.spin_enabled ? (
        <Alert>
          <Lightbulb className="h-4 w-4" />
          <AlertDescription>
            <strong>SPIN Selling</strong> é uma metodologia de vendas que usa perguntas de
            Situação, Problema, Implicação e Necessidade para qualificar leads de forma
            consultiva. Ative para configurar as perguntas.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Situation Questions */}
          <QuestionSection
            title="Perguntas de Situação"
            description="Entender o contexto atual do cliente"
            icon={<HelpCircle className="h-5 w-5" />}
            color="text-blue-500"
            questions={config.spin_situation_questions}
            onAdd={(q) =>
              updateConfig({
                spin_situation_questions: [...config.spin_situation_questions, q],
              })
            }
            onRemove={(i) =>
              updateConfig({
                spin_situation_questions: config.spin_situation_questions.filter(
                  (_, idx) => idx !== i
                ),
              })
            }
            onUpdate={(i, v) => {
              const updated = [...config.spin_situation_questions];
              updated[i] = v;
              updateConfig({ spin_situation_questions: updated });
            }}
          />

          {/* Problem Questions */}
          <QuestionSection
            title="Perguntas de Problema"
            description="Identificar dores e dificuldades"
            icon={<AlertTriangle className="h-5 w-5" />}
            color="text-amber-500"
            questions={config.spin_problem_questions}
            onAdd={(q) =>
              updateConfig({
                spin_problem_questions: [...config.spin_problem_questions, q],
              })
            }
            onRemove={(i) =>
              updateConfig({
                spin_problem_questions: config.spin_problem_questions.filter(
                  (_, idx) => idx !== i
                ),
              })
            }
            onUpdate={(i, v) => {
              const updated = [...config.spin_problem_questions];
              updated[i] = v;
              updateConfig({ spin_problem_questions: updated });
            }}
          />

          {/* Implication Questions */}
          <QuestionSection
            title="Perguntas de Implicação"
            description="Mostrar consequências de não resolver"
            icon={<ArrowUpRight className="h-5 w-5" />}
            color="text-rose-500"
            questions={config.spin_implication_questions}
            onAdd={(q) =>
              updateConfig({
                spin_implication_questions: [...config.spin_implication_questions, q],
              })
            }
            onRemove={(i) =>
              updateConfig({
                spin_implication_questions: config.spin_implication_questions.filter(
                  (_, idx) => idx !== i
                ),
              })
            }
            onUpdate={(i, v) => {
              const updated = [...config.spin_implication_questions];
              updated[i] = v;
              updateConfig({ spin_implication_questions: updated });
            }}
          />

          {/* Need Questions */}
          <QuestionSection
            title="Perguntas de Necessidade"
            description="Confirmar interesse e próximos passos"
            icon={<Target className="h-5 w-5" />}
            color="text-emerald-500"
            questions={config.spin_need_questions}
            onAdd={(q) =>
              updateConfig({
                spin_need_questions: [...config.spin_need_questions, q],
              })
            }
            onRemove={(i) =>
              updateConfig({
                spin_need_questions: config.spin_need_questions.filter(
                  (_, idx) => idx !== i
                ),
              })
            }
            onUpdate={(i, v) => {
              const updated = [...config.spin_need_questions];
              updated[i] = v;
              updateConfig({ spin_need_questions: updated });
            }}
          />

          {/* Escalation Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Critérios de Escalonamento
              </CardTitle>
              <CardDescription>
                Situações em que a IA deve transferir para um humano
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.escalation_criteria.map((criteria, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline" className="shrink-0 bg-orange-500/10 text-orange-600">
                    ⚡
                  </Badge>
                  <Input
                    value={criteria}
                    onChange={(e) => {
                      const updated = [...config.escalation_criteria];
                      updated[index] = e.target.value;
                      updateConfig({ escalation_criteria: updated });
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => removeCriteria(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Separator />

              <div className="flex gap-2">
                <Input
                  placeholder="Adicionar critério de escalonamento..."
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCriteria()}
                  className="flex-1"
                />
                <Button onClick={addCriteria} disabled={!newCriteria.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
