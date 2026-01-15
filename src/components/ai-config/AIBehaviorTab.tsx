import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  User, 
  MapPin, 
  Home, 
  Calendar, 
  RefreshCw, 
  Send, 
  AlertCircle,
  Lock,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Settings
} from "lucide-react";
import { useUpdateAIFunction } from "@/hooks/useAIBehavior";
import type { AIBehaviorConfig, QuestionCategory } from "@/types/ai-behavior";

interface AIBehaviorTabProps {
  behaviorConfig: AIBehaviorConfig | null | undefined;
}

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

export function AIBehaviorTab({ behaviorConfig }: AIBehaviorTabProps) {
  const updateFunction = useUpdateAIFunction();

  const handleToggleFunction = (functionId: string, enabled: boolean) => {
    if (!behaviorConfig) return;
    updateFunction.mutate({
      configId: behaviorConfig.id,
      functionId,
      enabled,
    });
  };

  if (!behaviorConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Carregando configurações de comportamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Essential Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Perguntas Essenciais ({behaviorConfig.essential_questions.filter(q => q.enabled).length})</CardTitle>
            <CardDescription>
              Perguntas que a IA fará durante a qualificação do lead
            </CardDescription>
          </div>
          <Button variant="outline">Editar</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {behaviorConfig.essential_questions.map((question) => (
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

      {/* AI Functions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Funções da IA</h3>
        {behaviorConfig.functions.map((func) => (
          <Card key={func.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    {functionIcons[func.id] || <Settings className="h-5 w-5" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold">{func.name}</h4>
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
                    {func.enabled && func.id === 'reengagement' && (
                      <p className="mt-2 text-sm">
                        A IA tentará reengajar após {behaviorConfig.reengagement_hours} horas da última resposta
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
      </div>
    </div>
  );
}
