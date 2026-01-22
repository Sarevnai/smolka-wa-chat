import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bot, Building2, Save, Plus, Trash2, MessageSquare, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
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
