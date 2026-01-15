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
import { Separator } from "@/components/ui/separator";
import { Loader2, Calendar, RefreshCw, Send, AlertCircle } from "lucide-react";
import { useUpdateAIFunction, useUpdateReengagementHours, useUpdateVisitSchedule } from "@/hooks/useAIBehavior";
import type { AIFunction, AIBehaviorConfig, VisitSchedule } from "@/types/ai-behavior";

interface EditAIFunctionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configId: string;
  func: AIFunction;
  behaviorConfig: AIBehaviorConfig;
}

export function EditAIFunctionModal({
  open,
  onOpenChange,
  configId,
  func,
  behaviorConfig,
}: EditAIFunctionModalProps) {
  const [localFunc, setLocalFunc] = useState<AIFunction>(func);
  const [reengagementHours, setReengagementHours] = useState(behaviorConfig.reengagement_hours);
  const [visitSchedule, setVisitSchedule] = useState<VisitSchedule>(behaviorConfig.visit_schedule);
  
  const updateFunction = useUpdateAIFunction();
  const updateReengagement = useUpdateReengagementHours();
  const updateSchedule = useUpdateVisitSchedule();

  useEffect(() => {
    if (open) {
      setLocalFunc(func);
      setReengagementHours(behaviorConfig.reengagement_hours);
      setVisitSchedule(behaviorConfig.visit_schedule);
    }
  }, [open, func, behaviorConfig]);

  const handleSave = async () => {
    try {
      // Update function config
      await updateFunction.mutateAsync({
        configId,
        functionId: localFunc.id,
        enabled: localFunc.enabled,
        config: localFunc.config,
      });

      // Update reengagement hours if applicable
      if (localFunc.id === 'reengagement') {
        await updateReengagement.mutateAsync({
          configId,
          hours: reengagementHours,
        });
      }

      // Update visit schedule if applicable
      if (localFunc.id === 'visit_scheduling') {
        await updateSchedule.mutateAsync({
          configId,
          schedule: visitSchedule,
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error saving function config:', error);
    }
  };

  const isSaving = updateFunction.isPending || updateReengagement.isPending || updateSchedule.isPending;

  const renderFunctionConfig = () => {
    switch (localFunc.id) {
      case 'visit_scheduling':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Solicitar CPF</Label>
                <p className="text-sm text-muted-foreground">
                  Exigir CPF do cliente para agendar visita
                </p>
              </div>
              <Switch
                checked={localFunc.config?.requireCpf ?? false}
                onCheckedChange={(checked) =>
                  setLocalFunc({
                    ...localFunc,
                    config: { ...localFunc.config, requireCpf: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mínimo de dias</Label>
                <Input
                  type="number"
                  min={1}
                  value={localFunc.config?.minDays ?? 1}
                  onChange={(e) =>
                    setLocalFunc({
                      ...localFunc,
                      config: { ...localFunc.config, minDays: parseInt(e.target.value) || 1 },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Antecedência mínima para agendar
                </p>
              </div>
              <div className="space-y-2">
                <Label>Máximo de dias</Label>
                <Input
                  type="number"
                  min={1}
                  value={localFunc.config?.maxDays ?? 14}
                  onChange={(e) =>
                    setLocalFunc({
                      ...localFunc,
                      config: { ...localFunc.config, maxDays: parseInt(e.target.value) || 14 },
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Antecedência máxima para agendar
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Horários Disponíveis</Label>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dias úteis</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={visitSchedule.weekdays?.start ?? "09:00"}
                      onChange={(e) =>
                        setVisitSchedule({
                          ...visitSchedule,
                          weekdays: { ...visitSchedule.weekdays, start: e.target.value, end: visitSchedule.weekdays?.end ?? "18:00" },
                        })
                      }
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={visitSchedule.weekdays?.end ?? "18:00"}
                      onChange={(e) =>
                        setVisitSchedule({
                          ...visitSchedule,
                          weekdays: { ...visitSchedule.weekdays, start: visitSchedule.weekdays?.start ?? "09:00", end: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Sábado</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="time"
                      className="w-28"
                      value={visitSchedule.saturday?.start ?? "09:00"}
                      onChange={(e) =>
                        setVisitSchedule({
                          ...visitSchedule,
                          saturday: { ...visitSchedule.saturday, start: e.target.value, end: visitSchedule.saturday?.end ?? "12:00" },
                        })
                      }
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={visitSchedule.saturday?.end ?? "12:00"}
                      onChange={(e) =>
                        setVisitSchedule({
                          ...visitSchedule,
                          saturday: { ...visitSchedule.saturday, start: visitSchedule.saturday?.start ?? "09:00", end: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">Domingo</span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={visitSchedule.sunday !== null}
                      onCheckedChange={(checked) =>
                        setVisitSchedule({
                          ...visitSchedule,
                          sunday: checked ? { start: "09:00", end: "12:00" } : null,
                        })
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {visitSchedule.sunday ? "Disponível" : "Fechado"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'reengagement':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Horas para reengajar</Label>
              <Input
                type="number"
                min={1}
                max={72}
                value={reengagementHours}
                onChange={(e) => setReengagementHours(parseInt(e.target.value) || 6)}
              />
              <p className="text-sm text-muted-foreground">
                Após quantas horas sem resposta a IA tentará reengajar o lead
              </p>
            </div>
          </div>
        );

      case 'cold_leads_crm':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enviar leads frios</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar leads não qualificados para o CRM
                </p>
              </div>
              <Switch
                checked={Boolean(localFunc.config?.sendColdLeads ?? false)}
                onCheckedChange={(checked) =>
                  setLocalFunc({
                    ...localFunc,
                    config: { ...localFunc.config, sendColdLeads: checked },
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Score mínimo para envio</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={Number(localFunc.config?.minScore ?? 50)}
                onChange={(e) =>
                  setLocalFunc({
                    ...localFunc,
                    config: { ...localFunc.config, minScore: parseInt(e.target.value) || 50 },
                  })
                }
              />
              <p className="text-sm text-muted-foreground">
                Leads com score abaixo deste valor não serão enviados
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="py-4 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Esta função não possui configurações adicionais.</p>
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (localFunc.id) {
      case 'visit_scheduling':
        return <Calendar className="h-5 w-5" />;
      case 'reengagement':
        return <RefreshCw className="h-5 w-5" />;
      case 'cold_leads_crm':
        return <Send className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {localFunc.name}
          </DialogTitle>
          <DialogDescription>{localFunc.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-0.5">
              <Label className="text-base">Função Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar esta função da IA
              </p>
            </div>
            <Switch
              checked={localFunc.enabled}
              onCheckedChange={(checked) =>
                setLocalFunc({ ...localFunc, enabled: checked })
              }
            />
          </div>

          <Separator className="mb-4" />

          {localFunc.enabled ? (
            renderFunctionConfig()
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>Ative a função para configurar suas opções.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
