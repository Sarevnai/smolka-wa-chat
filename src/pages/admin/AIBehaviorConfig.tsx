import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useAIBehaviorConfig, 
  useUpdateAIFunction 
} from "@/hooks/useAIBehavior";
import { 
  Bot, 
  Settings, 
  Lock,
  Lightbulb,
  MessageSquare,
  User,
  MapPin,
  Home,
  Calendar,
  RefreshCw,
  Send,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { QuestionCategory } from "@/types/ai-behavior";

const categoryIcons: Record<QuestionCategory, React.ReactNode> = {
  operation: <MessageSquare className="h-4 w-4" />,
  lead_info: <User className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  property: <Home className="h-4 w-4" />,
};

const categoryLabels: Record<QuestionCategory, string> = {
  operation: 'Operação',
  lead_info: 'Info lead',
  location: 'Localização',
  property: 'Caract. imóvel',
};

const functionIcons: Record<string, React.ReactNode> = {
  iptu_access: <Home className="h-5 w-5" />,
  visit_scheduling: <Calendar className="h-5 w-5" />,
  reengagement: <RefreshCw className="h-5 w-5" />,
  full_address: <MapPin className="h-5 w-5" />,
  cold_leads_crm: <Send className="h-5 w-5" />,
  invalid_whatsapp: <AlertCircle className="h-5 w-5" />,
};

export default function AIBehaviorConfig() {
  const { data: config, isLoading } = useAIBehaviorConfig();
  const updateFunction = useUpdateAIFunction();

  const handleToggleFunction = (functionId: string, enabled: boolean) => {
    if (!config) return;
    updateFunction.mutate({
      configId: config.id,
      functionId,
      enabled,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Minha IA</span>
              <span className="text-muted-foreground">/</span>
              <h1 className="text-2xl font-bold tracking-tight">Comportamento da IA</h1>
            </div>
            <p className="text-muted-foreground">
              Configure como sua IA deverá se comportar durante o atendimento
            </p>
          </div>
        </div>

        <Tabs defaultValue="questions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="questions">Perguntas essenciais</TabsTrigger>
            <TabsTrigger value="functions">Funções</TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Perguntas ativas ({config?.essential_questions.filter(q => q.enabled).length || 0})</CardTitle>
                  <CardDescription>
                    Perguntas que a IA fará durante a qualificação do lead
                  </CardDescription>
                </div>
                <Button variant="outline">Editar</Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {config?.essential_questions.map((question) => (
                  <div 
                    key={question.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {question.isLocked && (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={question.enabled ? '' : 'text-muted-foreground'}>
                        {question.question}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="gap-1">
                        {categoryIcons[question.category]}
                        {categoryLabels[question.category]}
                      </Badge>
                      {question.isQualifying && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Qualif.
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription>
                <strong>Saiba mais</strong><br />
                <span className="text-muted-foreground">
                  Como funciona? A IA coleta informações importantes sobre o lead durante a conversa.
                  Perguntas marcadas como "Qualificadora" são essenciais para determinar se o lead está
                  pronto para ser enviado ao CRM.
                </span>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Functions Tab */}
          <TabsContent value="functions" className="space-y-4">
            {config?.functions.map((func) => (
              <Card key={func.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        {functionIcons[func.id] || <Settings className="h-5 w-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{func.name}</h3>
                          <Badge variant={func.enabled ? 'default' : 'secondary'}>
                            {func.enabled ? (
                              <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Inativo</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{func.description}</p>
                        
                        {/* Function specific configs */}
                        {func.enabled && func.id === 'visit_scheduling' && func.config && (
                          <div className="mt-2 text-sm space-y-1">
                            <p>Solicitação de CPF: {func.config.requireCpf ? 'ligado' : 'desligado'}</p>
                            <p>Período disponível: Mínimo {func.config.minDays} dia, Máximo {func.config.maxDays} dias</p>
                          </div>
                        )}
                        {func.enabled && func.id === 'reengagement' && config && (
                          <p className="mt-2 text-sm">
                            A IA tentará reengajar após {config.reengagement_hours} horas da última resposta
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={func.enabled}
                        onCheckedChange={(checked) => handleToggleFunction(func.id, checked)}
                        disabled={updateFunction.isPending}
                      />
                      <Button variant="ghost" size="sm">Editar</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
