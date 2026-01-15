import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Home, 
  ShoppingBag, 
  Megaphone, 
  Save, 
  Loader2, 
  Plus,
  Sparkles,
  Target,
  Zap,
  Users,
  Building
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketingProfile {
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
  property_confirmation_enabled: boolean;
  property_confirmation_message: string;
  auto_update_vista: boolean;
  remove_from_site_when_sold: boolean;
}

const defaultMarketingProfile: MarketingProfile = {
  enabled: false,
  agent_name: "Nina Marketing",
  greeting_message: "Olá! 👋 Sou a Nina, assistente de marketing. Como posso ajudá-lo hoje?",
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
  property_confirmation_enabled: true,
  property_confirmation_message: "Olá! 🏠 Aqui é a Nina da Smolka Imóveis. Estou entrando em contato sobre o seu imóvel no endereço [ENDEREÇO]. O imóvel ainda está disponível para venda?",
  auto_update_vista: true,
  remove_from_site_when_sold: true,
};

export function AIProfilesTab() {
  const [activeProfile, setActiveProfile] = useState("locacao");
  const [marketingConfig, setMarketingConfig] = useState<MarketingProfile>(defaultMarketingProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newRule, setNewRule] = useState({ keyword: "", tag: "" });
  const [newEscalation, setNewEscalation] = useState("");

  useEffect(() => {
    loadMarketingConfig();
  }, []);

  const loadMarketingConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("setting_value")
        .eq("setting_key", "marketing_ai_config")
        .single();

      if (data?.setting_value) {
        setMarketingConfig({ ...defaultMarketingProfile, ...(data.setting_value as unknown as MarketingProfile) });
      }
    } catch (error) {
      console.log("No existing marketing config, using defaults");
    } finally {
      setIsLoading(false);
    }
  };

  const saveMarketingConfig = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("system_settings")
        .upsert([{
          setting_key: "marketing_ai_config",
          setting_category: "marketing",
          setting_value: JSON.parse(JSON.stringify(marketingConfig)),
          updated_at: new Date().toISOString(),
        }], { onConflict: "setting_key" });

      if (error) throw error;
      toast.success("Perfil de Marketing salvo com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setMarketingConfig(prev => ({
        ...prev,
        qualification_questions: [...prev.qualification_questions, newQuestion.trim()],
      }));
      setNewQuestion("");
    }
  };

  const removeQuestion = (index: number) => {
    setMarketingConfig(prev => ({
      ...prev,
      qualification_questions: prev.qualification_questions.filter((_, i) => i !== index),
    }));
  };

  const addRule = () => {
    if (newRule.keyword.trim() && newRule.tag.trim()) {
      setMarketingConfig(prev => ({
        ...prev,
        auto_tag_rules: [...prev.auto_tag_rules, { ...newRule }],
      }));
      setNewRule({ keyword: "", tag: "" });
    }
  };

  const removeRule = (index: number) => {
    setMarketingConfig(prev => ({
      ...prev,
      auto_tag_rules: prev.auto_tag_rules.filter((_, i) => i !== index),
    }));
  };

  const addEscalation = () => {
    if (newEscalation.trim()) {
      setMarketingConfig(prev => ({
        ...prev,
        escalation_keywords: [...prev.escalation_keywords, newEscalation.trim()],
      }));
      setNewEscalation("");
    }
  };

  const removeEscalation = (index: number) => {
    setMarketingConfig(prev => ({
      ...prev,
      escalation_keywords: prev.escalation_keywords.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Perfis por Setor</CardTitle>
          <CardDescription>
            Configure comportamentos específicos da IA para cada setor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeProfile} onValueChange={setActiveProfile}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="locacao" className="gap-2">
                <Home className="h-4 w-4" />
                Locação
              </TabsTrigger>
              <TabsTrigger value="vendas" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Vendas
              </TabsTrigger>
              <TabsTrigger value="marketing" className="gap-2">
                <Megaphone className="h-4 w-4" />
                Marketing
              </TabsTrigger>
            </TabsList>

            {/* Locação Profile */}
            <TabsContent value="locacao" className="mt-6">
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center space-y-2">
                  <Home className="h-12 w-12 mx-auto opacity-50" />
                  <p>Perfil de Locação usa as configurações globais</p>
                  <p className="text-sm">Configure na aba "Identidade" e "Comportamento"</p>
                </div>
              </div>
            </TabsContent>

            {/* Vendas Profile */}
            <TabsContent value="vendas" className="mt-6">
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <div className="text-center space-y-2">
                  <ShoppingBag className="h-12 w-12 mx-auto opacity-50" />
                  <p>Perfil de Vendas usa as configurações globais</p>
                  <p className="text-sm">Configure na aba "Identidade" e "Comportamento"</p>
                </div>
              </div>
            </TabsContent>

            {/* Marketing Profile */}
            <TabsContent value="marketing" className="mt-6 space-y-6">
              {/* Enable Marketing AI */}
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${marketingConfig.enabled ? "bg-green-100" : "bg-muted"}`}>
                    <Megaphone className={`h-6 w-6 ${marketingConfig.enabled ? "text-green-600" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Agente IA para Marketing</h3>
                    <p className="text-sm text-muted-foreground">
                      {marketingConfig.enabled ? "Ativo e respondendo leads" : "Desativado"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={marketingConfig.enabled}
                  onCheckedChange={(enabled) => setMarketingConfig(prev => ({ ...prev, enabled }))}
                />
              </div>

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
                        value={marketingConfig.agent_name}
                        onChange={(e) => setMarketingConfig(prev => ({ ...prev, agent_name: e.target.value }))}
                        placeholder="Ex: Nina Marketing"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Tom de Comunicação</Label>
                      <Select
                        value={marketingConfig.tone}
                        onValueChange={(tone: MarketingProfile['tone']) => setMarketingConfig(prev => ({ ...prev, tone }))}
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
                        value={marketingConfig.greeting_message}
                        onChange={(e) => setMarketingConfig(prev => ({ ...prev, greeting_message: e.target.value }))}
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
                        checked={marketingConfig.qualification_enabled}
                        onCheckedChange={(qualification_enabled) =>
                          setMarketingConfig(prev => ({ ...prev, qualification_enabled }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Perguntas de Qualificação</Label>
                      <div className="space-y-2 mt-2">
                        {marketingConfig.qualification_questions.map((q, i) => (
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
                        checked={marketingConfig.auto_tag_enabled}
                        onCheckedChange={(auto_tag_enabled) =>
                          setMarketingConfig(prev => ({ ...prev, auto_tag_enabled }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Regras de Tag (palavra-chave → tag)</Label>
                      <div className="space-y-2 mt-2">
                        {marketingConfig.auto_tag_rules.map((rule, i) => (
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
                            onChange={(e) => setNewRule(r => ({ ...r, keyword: e.target.value }))}
                            placeholder="Palavra-chave"
                            className="flex-1"
                          />
                          <Input
                            value={newRule.tag}
                            onChange={(e) => setNewRule(r => ({ ...r, tag: e.target.value }))}
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
                        {marketingConfig.escalation_keywords.map((kw, i) => (
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

                {/* Property Confirmation */}
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
                        checked={marketingConfig.property_confirmation_enabled}
                        onCheckedChange={(property_confirmation_enabled) =>
                          setMarketingConfig(prev => ({ ...prev, property_confirmation_enabled }))
                        }
                      />
                    </div>

                    <div>
                      <Label>Mensagem Inicial da Campanha</Label>
                      <Textarea
                        value={marketingConfig.property_confirmation_message}
                        onChange={(e) => setMarketingConfig(prev => ({ ...prev, property_confirmation_message: e.target.value }))}
                        rows={3}
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Use [ENDEREÇO] para inserir o endereço do imóvel
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Atualizar Vista CRM automaticamente</Label>
                      <Switch
                        checked={marketingConfig.auto_update_vista}
                        onCheckedChange={(auto_update_vista) =>
                          setMarketingConfig(prev => ({ ...prev, auto_update_vista }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Remover do site quando vendido</Label>
                      <Switch
                        checked={marketingConfig.remove_from_site_when_sold}
                        onCheckedChange={(remove_from_site_when_sold) =>
                          setMarketingConfig(prev => ({ ...prev, remove_from_site_when_sold }))
                        }
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={saveMarketingConfig} disabled={isSaving} size="lg" className="bg-pink-500 hover:bg-pink-600">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Salvar Perfil Marketing
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
