import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Bot, 
  Building2, 
  Save, 
  Plus, 
  Trash2, 
  MessageSquare, 
  AlertTriangle, 
  HelpCircle, 
  Loader2,
  Heart,
  Zap,
  Shield,
  Clock,
  Star,
  Users,
  ChevronDown
} from "lucide-react";
import type { AIAgentConfig } from "@/hooks/useAIUnifiedConfig";

interface AIIdentityTabProps {
  config: AIAgentConfig;
  updateConfig: (updates: Partial<AIAgentConfig>) => void;
  saveConfig: () => Promise<void>;
  isSaving: boolean;
}

export function AIIdentityTab({ config, updateConfig, saveConfig, isSaving }: AIIdentityTabProps) {
  const [newService, setNewService] = useState('');
  const [newLimitation, setNewLimitation] = useState('');
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [newObjection, setNewObjection] = useState("");
  const [newResponse, setNewResponse] = useState("");
  const [salesOpen, setSalesOpen] = useState(false);

  const addService = () => {
    if (newService.trim()) {
      updateConfig({ services: [...config.services, newService.trim()] });
      setNewService('');
    }
  };

  const removeService = (index: number) => {
    updateConfig({ services: config.services.filter((_, i) => i !== index) });
  };

  const addLimitation = () => {
    if (newLimitation.trim()) {
      updateConfig({ limitations: [...config.limitations, newLimitation.trim()] });
      setNewLimitation('');
    }
  };

  const removeLimitation = (index: number) => {
    updateConfig({ limitations: config.limitations.filter((_, i) => i !== index) });
  };

  const addFaq = () => {
    if (newFaq.question.trim() && newFaq.answer.trim()) {
      updateConfig({ faqs: [...config.faqs, { ...newFaq }] });
      setNewFaq({ question: '', answer: '' });
    }
  };

  const removeFaq = (index: number) => {
    updateConfig({ faqs: config.faqs.filter((_, i) => i !== index) });
  };

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

  const toneOptions = [
    { value: 'formal', label: 'Formal', description: 'Profissional e respeitoso' },
    { value: 'casual', label: 'Casual', description: 'Descontraído mas educado' },
    { value: 'friendly', label: 'Amigável', description: 'Acolhedor e empático' },
    { value: 'technical', label: 'Técnico', description: 'Preciso e objetivo' }
  ];

  return (
    <div className="space-y-6">
      {/* Agent Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>Identidade do Agente</CardTitle>
          </div>
          <CardDescription>Defina o nome e personalidade do seu assistente virtual</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name">Nome do Agente</Label>
              <Input
                id="agent-name"
                value={config.agent_name}
                onChange={(e) => updateConfig({ agent_name: e.target.value })}
                placeholder="Ex: Helena, Assistente Virtual"
              />
            </div>
            <div className="space-y-2">
              <Label>Tom de Comunicação</Label>
              <Select 
                value={config.tone} 
                onValueChange={(value: AIAgentConfig['tone']) => updateConfig({ tone: value })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="greeting">Mensagem de Saudação</Label>
            <Textarea
              id="greeting"
              value={config.greeting_message}
              onChange={(e) => updateConfig({ greeting_message: e.target.value })}
              placeholder="Olá! Sou o assistente virtual. Como posso ajudá-lo?"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{company_name}'} para inserir o nome da empresa automaticamente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fallback">Mensagem de Fallback</Label>
            <Textarea
              id="fallback"
              value={config.fallback_message}
              onChange={(e) => updateConfig({ fallback_message: e.target.value })}
              placeholder="Entendi sua solicitação. Um atendente entrará em contato em breve."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Informações da Empresa</CardTitle>
          </div>
          <CardDescription>Contexto sobre a empresa para o agente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input
                value={config.company_name}
                onChange={(e) => updateConfig({ company_name: e.target.value })}
                placeholder="Smolka Imóveis"
              />
            </div>
            <div className="space-y-2">
              <Label>Público-Alvo</Label>
              <Input
                value={config.target_audience}
                onChange={(e) => updateConfig({ target_audience: e.target.value })}
                placeholder="Ex: Proprietários e inquilinos"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição da Empresa</Label>
            <Textarea
              value={config.company_description}
              onChange={(e) => updateConfig({ company_description: e.target.value })}
              placeholder="Descreva o que a empresa faz..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Valores da Empresa</Label>
            <Textarea
              value={config.company_values}
              onChange={(e) => updateConfig({ company_values: e.target.value })}
              placeholder="Ética, transparência, compromisso..."
              rows={2}
            />
          </div>

          <Separator />

          {/* Services */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Serviços Oferecidos
            </Label>
            <div className="flex flex-wrap gap-2">
              {config.services.map((service, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {service}
                  <button onClick={() => removeService(index)} className="ml-1 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Novo serviço..."
                onKeyDown={(e) => e.key === 'Enter' && addService()}
              />
              <Button onClick={addService} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle>Limitações do Agente</CardTitle>
          </div>
          <CardDescription>O que o agente NÃO deve fazer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {config.limitations.map((limitation, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <span className="flex-1 text-sm">{limitation}</span>
                <Button variant="ghost" size="icon" onClick={() => removeLimitation(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                value={newLimitation}
                onChange={(e) => setNewLimitation(e.target.value)}
                placeholder="Nova limitação..."
                onKeyDown={(e) => e.key === 'Enter' && addLimitation()}
              />
              <Button onClick={addLimitation} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQs */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            <CardTitle>Perguntas Frequentes</CardTitle>
          </div>
          <CardDescription>Respostas prontas para perguntas comuns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.faqs.map((faq, index) => (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <p className="font-medium text-sm">P: {faq.question}</p>
                  <p className="text-sm text-muted-foreground">R: {faq.answer}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeFaq(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <div className="space-y-2 p-3 border border-dashed rounded-lg">
            <Input
              value={newFaq.question}
              onChange={(e) => setNewFaq(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Pergunta..."
            />
            <Textarea
              value={newFaq.answer}
              onChange={(e) => setNewFaq(prev => ({ ...prev, answer: e.target.value }))}
              placeholder="Resposta..."
              rows={2}
            />
            <Button onClick={addFaq} className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar FAQ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sales Section (Collapsible - Advanced) */}
      <Collapsible open={salesOpen} onOpenChange={setSalesOpen}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <CardTitle>Configurações de Vendas</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">Avançado</Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${salesOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CollapsibleTrigger>
            <CardDescription>Rapport, gatilhos mentais e tratamento de objeções</CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-0">
              {/* Rapport */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <Label className="font-semibold">Técnicas de Rapport</Label>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>Rapport Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar técnicas de conexão emocional
                    </p>
                  </div>
                  <Switch
                    checked={config.rapport_enabled}
                    onCheckedChange={(checked) => updateConfig({ rapport_enabled: checked })}
                  />
                </div>

                {config.rapport_enabled && (
                  <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-rose-200">
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">Usar nome</span>
                      </div>
                      <Switch
                        checked={config.rapport_use_name}
                        onCheckedChange={(checked) => updateConfig({ rapport_use_name: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Star className="h-3 w-3" />
                        <span className="text-sm">Espelhar linguagem</span>
                      </div>
                      <Switch
                        checked={config.rapport_mirror_language}
                        onCheckedChange={(checked) => updateConfig({ rapport_mirror_language: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Heart className="h-3 w-3" />
                        <span className="text-sm">Empatia</span>
                      </div>
                      <Switch
                        checked={config.rapport_show_empathy}
                        onCheckedChange={(checked) => updateConfig({ rapport_show_empathy: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        <span className="text-sm">Validar emoções</span>
                      </div>
                      <Switch
                        checked={config.rapport_validate_emotions}
                        onCheckedChange={(checked) => updateConfig({ rapport_validate_emotions: checked })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Mental Triggers */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <Label className="font-semibold">Gatilhos Mentais</Label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <Label>Gatilhos Ativos</Label>
                    <p className="text-sm text-muted-foreground">
                      Habilitar uso de gatilhos de persuasão
                    </p>
                  </div>
                  <Switch
                    checked={config.triggers_enabled}
                    onCheckedChange={(checked) => updateConfig({ triggers_enabled: checked })}
                  />
                </div>

                {config.triggers_enabled && (
                  <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-amber-200">
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span className="text-sm">Urgência</span>
                      </div>
                      <Switch
                        checked={config.trigger_urgency}
                        onCheckedChange={(checked) => updateConfig({ trigger_urgency: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3" />
                        <span className="text-sm">Escassez</span>
                      </div>
                      <Switch
                        checked={config.trigger_scarcity}
                        onCheckedChange={(checked) => updateConfig({ trigger_scarcity: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span className="text-sm">Prova Social</span>
                      </div>
                      <Switch
                        checked={config.trigger_social_proof}
                        onCheckedChange={(checked) => updateConfig({ trigger_social_proof: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3" />
                        <span className="text-sm">Autoridade</span>
                      </div>
                      <Switch
                        checked={config.trigger_authority}
                        onCheckedChange={(checked) => updateConfig({ trigger_authority: checked })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Objections */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <Label className="font-semibold">Tratamento de Objeções ({config.objections.length})</Label>
                </div>

                {config.objections.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {config.objections.map((obj, index) => (
                      <div key={index} className="p-2 border rounded-lg text-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-xs text-muted-foreground">Objeção:</p>
                            <p className="truncate">{obj.objection}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeObjection(index)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 p-3 border border-dashed rounded-lg">
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
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Objeção
                  </Button>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Identidade
        </Button>
      </div>
    </div>
  );
}
