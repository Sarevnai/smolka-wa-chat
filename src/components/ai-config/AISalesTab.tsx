import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Users,
  Heart,
  Zap,
  Shield,
  Clock,
  Star,
  Trash2,
  Plus,
  Loader2,
  Save,
} from "lucide-react";
import type { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";

interface AISalesTabProps {
  config: AIAgentConfig;
  updateConfig: (updates: Partial<AIAgentConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
}

export function AISalesTab({ config, updateConfig, saveConfig, isSaving }: AISalesTabProps) {
  const [newObjection, setNewObjection] = useState("");
  const [newResponse, setNewResponse] = useState("");

  const addObjection = () => {
    if (!newObjection.trim() || !newResponse.trim()) return;
    updateConfig({
      objections: [
        ...config.objections,
        { objection: newObjection.trim(), response: newResponse.trim() },
      ],
    });
    setNewObjection("");
    setNewResponse("");
  };

  const removeObjection = (index: number) => {
    updateConfig({
      objections: config.objections.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* Rapport Techniques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            Técnicas de Rapport
          </CardTitle>
          <CardDescription>
            Configure como a IA estabelece conexão emocional com os leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Rapport Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar técnicas de rapport nas conversas
              </p>
            </div>
            <Switch
              checked={config.rapport_enabled}
              onCheckedChange={(checked) => updateConfig({ rapport_enabled: checked })}
            />
          </div>

          {config.rapport_enabled && (
            <>
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Usar nome do cliente</Label>
                      <p className="text-xs text-muted-foreground">
                        Chamar o lead pelo nome durante a conversa
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.rapport_use_name}
                    onCheckedChange={(checked) => updateConfig({ rapport_use_name: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Espelhar linguagem</Label>
                      <p className="text-xs text-muted-foreground">
                        Adaptar tom e vocabulário ao do cliente
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.rapport_mirror_language}
                    onCheckedChange={(checked) => updateConfig({ rapport_mirror_language: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Demonstrar empatia</Label>
                      <p className="text-xs text-muted-foreground">
                        Mostrar compreensão com as necessidades
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.rapport_show_empathy}
                    onCheckedChange={(checked) => updateConfig({ rapport_show_empathy: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Validar emoções</Label>
                      <p className="text-xs text-muted-foreground">
                        Reconhecer e validar sentimentos expressos
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.rapport_validate_emotions}
                    onCheckedChange={(checked) => updateConfig({ rapport_validate_emotions: checked })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Mental Triggers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Gatilhos Mentais
          </CardTitle>
          <CardDescription>
            Configure os gatilhos de persuasão usados pela IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Gatilhos Ativos</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar uso de gatilhos mentais
              </p>
            </div>
            <Switch
              checked={config.triggers_enabled}
              onCheckedChange={(checked) => updateConfig({ triggers_enabled: checked })}
            />
          </div>

          {config.triggers_enabled && (
            <>
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Urgência</Label>
                      <p className="text-xs text-muted-foreground">
                        "Esta oportunidade é por tempo limitado"
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.trigger_urgency}
                    onCheckedChange={(checked) => updateConfig({ trigger_urgency: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Escassez</Label>
                      <p className="text-xs text-muted-foreground">
                        "Restam apenas X unidades disponíveis"
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.trigger_scarcity}
                    onCheckedChange={(checked) => updateConfig({ trigger_scarcity: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Prova Social</Label>
                      <p className="text-xs text-muted-foreground">
                        Mencionar outros clientes satisfeitos
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.trigger_social_proof}
                    onCheckedChange={(checked) => updateConfig({ trigger_social_proof: checked })}
                  />
                </div>

                {config.trigger_social_proof && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">Texto de prova social</Label>
                    <Textarea
                      value={config.social_proof_text}
                      onChange={(e) => updateConfig({ social_proof_text: e.target.value })}
                      placeholder="Já ajudamos mais de 500 famílias..."
                      rows={2}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Autoridade</Label>
                      <p className="text-xs text-muted-foreground">
                        Demonstrar expertise e credibilidade
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.trigger_authority}
                    onCheckedChange={(checked) => updateConfig({ trigger_authority: checked })}
                  />
                </div>

                {config.trigger_authority && (
                  <div className="ml-6 space-y-2">
                    <Label className="text-sm">Texto de autoridade</Label>
                    <Textarea
                      value={config.authority_text}
                      onChange={(e) => updateConfig({ authority_text: e.target.value })}
                      placeholder="Somos especialistas há mais de 20 anos..."
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Objection Handling */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Tratamento de Objeções
          </CardTitle>
          <CardDescription>
            Configure respostas para objeções comuns dos clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full">
            {config.objections.map((obj, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Objeção {index + 1}
                    </Badge>
                    <span className="text-sm font-normal truncate max-w-[300px]">
                      {obj.objection}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Objeção do cliente</Label>
                    <Input
                      value={obj.objection}
                      onChange={(e) => {
                        const updated = [...config.objections];
                        updated[index] = { ...updated[index], objection: e.target.value };
                        updateConfig({ objections: updated });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Resposta da IA</Label>
                    <Textarea
                      value={obj.response}
                      onChange={(e) => {
                        const updated = [...config.objections];
                        updated[index] = { ...updated[index], response: e.target.value };
                        updateConfig({ objections: updated });
                      }}
                      rows={3}
                    />
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeObjection(index)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Separator />

          <div className="space-y-3">
            <Label>Adicionar Nova Objeção</Label>
            <Input
              placeholder="Objeção do cliente..."
              value={newObjection}
              onChange={(e) => setNewObjection(e.target.value)}
            />
            <Textarea
              placeholder="Resposta da IA..."
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              rows={2}
            />
            <Button
              onClick={addObjection}
              disabled={!newObjection.trim() || !newResponse.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Objeção
            </Button>
          </div>
        </CardContent>
      </Card>

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
