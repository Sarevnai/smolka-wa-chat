import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bot, ArrowLeft, Save, Sparkles, MessageSquare, 
  Target, Users, Zap, Clock, Building, CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketingAIConfig {
  enabled: boolean;
  agent_name: string;
  greeting_message: string;
  tone: "formal" | "casual" | "friendly" | "persuasive";
  qualification_enabled: boolean;
  qualification_questions: string[];
  auto_tag_enabled: boolean;
  auto_tag_rules: { keyword: string; tag: string }[];
  escalation_keywords: string[];
  working_hours: { start: string; end: string };
  fallback_message: string;
  // Configurações de Campanha de Confirmação de Imóveis
  property_confirmation_enabled: boolean;
  property_confirmation_message: string;
  auto_update_vista: boolean;
  remove_from_site_when_sold: boolean;
}

const defaultConfig: MarketingAIConfig = {
  enabled: false,
  agent_name: "Helena Marketing",
  greeting_message: "Olá! 👋 Sou a Helena, assistente de marketing da Smolka. Como posso ajudá-lo hoje?",
  tone: "friendly",
  qualification_enabled: true,
  qualification_questions: [
    "Qual seu interesse principal?",
    "Você já conhece nossos serviços?",
    "Como ficou sabendo da gente?",
  ],
  auto_tag_enabled: true,
  auto_tag_rules: [
    { keyword: "preço", tag: "interesse-preco" },
    { keyword: "promoção", tag: "interesse-promocao" },
    { keyword: "desconto", tag: "interesse-desconto" },
  ],
  escalation_keywords: ["falar com humano", "atendente", "gerente", "reclamação"],
  working_hours: { start: "08:00", end: "18:00" },
  fallback_message: "No momento estou fora do horário de atendimento. Retornarei em breve!",
  // Defaults para confirmação de imóveis
  property_confirmation_enabled: true,
  property_confirmation_message: "Olá! 🏠 Aqui é a Helena da Smolka Imóveis. Estou entrando em contato sobre o seu imóvel no endereço [ENDEREÇO]. O imóvel ainda está disponível para venda?",
  auto_update_vista: true,
  remove_from_site_when_sold: true,
};

export default function MarketingAIConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<MarketingAIConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newEscalation, setNewEscalation] = useState("");
  const [newRule, setNewRule] = useState({ keyword: "", tag: "" });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "marketing_ai_config")
        .single();

      if (data?.setting_value) {
        setConfig({ ...defaultConfig, ...(data.setting_value as unknown as MarketingAIConfig) });
      }
    } catch (error) {
      console.log("No existing config, using defaults");
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert([{
          setting_key: "marketing_ai_config",
          setting_category: "marketing",
          setting_value: JSON.parse(JSON.stringify(config)),
          updated_at: new Date().toISOString(),
        }], { onConflict: "setting_key" });

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setConfig((prev) => ({
        ...prev,
        qualification_questions: [...prev.qualification_questions, newQuestion.trim()],
      }));
      setNewQuestion("");
    }
  };

  const removeQuestion = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      qualification_questions: prev.qualification_questions.filter((_, i) => i !== index),
    }));
  };

  const addRule = () => {
    if (newRule.keyword.trim() && newRule.tag.trim()) {
      setConfig((prev) => ({
        ...prev,
        auto_tag_rules: [...prev.auto_tag_rules, { ...newRule }],
      }));
      setNewRule({ keyword: "", tag: "" });
    }
  };

  const removeRule = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      auto_tag_rules: prev.auto_tag_rules.filter((_, i) => i !== index),
    }));
  };

  const addEscalation = () => {
    if (newEscalation.trim()) {
      setConfig((prev) => ({
        ...prev,
        escalation_keywords: [...prev.escalation_keywords, newEscalation.trim()],
      }));
      setNewEscalation("");
    }
  };

  const removeEscalation = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      escalation_keywords: prev.escalation_keywords.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Carregando configurações...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/marketing")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Bot className="h-8 w-8 text-pink-500" />
                Agente IA Marketing
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure o assistente virtual do setor de marketing
              </p>
            </div>
          </div>
          <Button onClick={saveConfig} disabled={isSaving} className="bg-pink-500 hover:bg-pink-600">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>

        {/* Enable/Disable */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${config.enabled ? "bg-green-100" : "bg-gray-100"}`}>
                  <Bot className={`h-6 w-6 ${config.enabled ? "text-green-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className="font-semibold">Agente IA para Marketing</h3>
                  <p className="text-sm text-muted-foreground">
                    {config.enabled ? "Ativo e respondendo leads" : "Desativado"}
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => setConfig((prev) => ({ ...prev, enabled }))}
              />
            </div>
          </CardContent>
        </Card>

        <Accordion type="multiple" defaultValue={["identity", "qualification"]} className="space-y-4">
          {/* Identity */}
          <AccordionItem value="identity" className="border rounded-lg px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-pink-500" />
                <span>Identidade e Personalidade</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <Label>Nome do Agente</Label>
                  <Input
                    value={config.agent_name}
                    onChange={(e) => setConfig((prev) => ({ ...prev, agent_name: e.target.value }))}
                    placeholder="Ex: Helena Marketing"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tom de Comunicação</Label>
                <Select
                  value={config.tone}
                  onValueChange={(tone: any) => setConfig((prev) => ({ ...prev, tone }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Amigável</SelectItem>
                    <SelectItem value="persuasive">Persuasivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Mensagem de Saudação</Label>
                <Textarea
                  value={config.greeting_message}
                  onChange={(e) => setConfig((prev) => ({ ...prev, greeting_message: e.target.value }))}
                  placeholder="Olá! Como posso ajudar?"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Qualification */}
          <AccordionItem value="qualification" className="border rounded-lg px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <span>Qualificação de Leads</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <Label>Habilitar qualificação automática</Label>
                <Switch
                  checked={config.qualification_enabled}
                  onCheckedChange={(qualification_enabled) =>
                    setConfig((prev) => ({ ...prev, qualification_enabled }))
                  }
                />
              </div>
              <div>
                <Label>Perguntas de Qualificação</Label>
                <div className="space-y-2 mt-2">
                  {config.qualification_questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="secondary" className="flex-1 justify-start">
                        {q}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(i)}
                        className="text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Nova pergunta..."
                      onKeyDown={(e) => e.key === "Enter" && addQuestion()}
                    />
                    <Button onClick={addQuestion}>Adicionar</Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Auto Tagging */}
          <AccordionItem value="tagging" className="border rounded-lg px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                <span>Tags Automáticas</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <Label>Habilitar tags automáticas</Label>
                <Switch
                  checked={config.auto_tag_enabled}
                  onCheckedChange={(auto_tag_enabled) =>
                    setConfig((prev) => ({ ...prev, auto_tag_enabled }))
                  }
                />
              </div>
              <div>
                <Label>Regras de Tag (palavra-chave → tag)</Label>
                <div className="space-y-2 mt-2">
                  {config.auto_tag_rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{rule.keyword}</Badge>
                      <span>→</span>
                      <Badge>{rule.tag}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(i)}
                        className="text-destructive ml-auto"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newRule.keyword}
                      onChange={(e) => setNewRule((r) => ({ ...r, keyword: e.target.value }))}
                      placeholder="Palavra-chave"
                      className="flex-1"
                    />
                    <Input
                      value={newRule.tag}
                      onChange={(e) => setNewRule((r) => ({ ...r, tag: e.target.value }))}
                      placeholder="Tag"
                      className="flex-1"
                    />
                    <Button onClick={addRule}>Adicionar</Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Escalation */}
          <AccordionItem value="escalation" className="border rounded-lg px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <span>Escalação para Humano</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div>
                <Label>Palavras-chave de Escalação</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Quando o lead mencionar estas palavras, será direcionado para atendimento humano.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {config.escalation_keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="flex items-center gap-1">
                      {kw}
                      <button onClick={() => removeEscalation(i)} className="ml-1">×</button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newEscalation}
                    onChange={(e) => setNewEscalation(e.target.value)}
                    placeholder="Nova palavra-chave..."
                    onKeyDown={(e) => e.key === "Enter" && addEscalation()}
                  />
                  <Button onClick={addEscalation}>Adicionar</Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Property Confirmation Campaign */}
          <AccordionItem value="property-confirmation" className="border rounded-lg px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-emerald-500" />
                <span>Confirmação de Imóveis (Vista CRM)</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar campanhas de confirmação</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que a IA confirme disponibilidade e valor de imóveis com proprietários
                  </p>
                </div>
                <Switch
                  checked={config.property_confirmation_enabled}
                  onCheckedChange={(property_confirmation_enabled) =>
                    setConfig((prev) => ({ ...prev, property_confirmation_enabled }))
                  }
                />
              </div>

              <Separator />

              <div>
                <Label>Mensagem Inicial da Campanha</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use [ENDEREÇO] e [VALOR] como variáveis
                </p>
                <Textarea
                  value={config.property_confirmation_message}
                  onChange={(e) => setConfig((prev) => ({ ...prev, property_confirmation_message: e.target.value }))}
                  placeholder="Olá! 🏠 Estou entrando em contato sobre o seu imóvel..."
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-base font-semibold">Ações Automáticas no Vista CRM</Label>
                
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <div>
                      <span className="text-sm font-medium">Atualizar Vista automaticamente</span>
                      <p className="text-xs text-muted-foreground">
                        Atualiza status e valor do imóvel quando confirmado pelo proprietário
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.auto_update_vista}
                    onCheckedChange={(auto_update_vista) =>
                      setConfig((prev) => ({ ...prev, auto_update_vista }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-orange-500" />
                    <div>
                      <span className="text-sm font-medium">Remover do site quando vendido</span>
                      <p className="text-xs text-muted-foreground">
                        Define "Exibir no Site = Não" quando o imóvel for marcado como vendido
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={config.remove_from_site_when_sold}
                    onCheckedChange={(remove_from_site_when_sold) =>
                      setConfig((prev) => ({ ...prev, remove_from_site_when_sold }))
                    }
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Como funciona:</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                  <li>Crie uma campanha com contatos importados (com dados do imóvel)</li>
                  <li>A IA envia a mensagem inicial perguntando sobre disponibilidade</li>
                  <li>O proprietário responde e a IA confirma valor ou atualiza status</li>
                  <li>O Vista CRM é atualizado automaticamente</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Working Hours */}
          <AccordionItem value="hours" className="border rounded-lg px-4">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <span>Horário de Funcionamento</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={config.working_hours.start}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        working_hours: { ...prev.working_hours, start: e.target.value },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={config.working_hours.end}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        working_hours: { ...prev.working_hours, end: e.target.value },
                      }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Mensagem fora do horário</Label>
                <Textarea
                  value={config.fallback_message}
                  onChange={(e) => setConfig((prev) => ({ ...prev, fallback_message: e.target.value }))}
                  className="mt-1"
                  rows={2}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Layout>
  );
}
