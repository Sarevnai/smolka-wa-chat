import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, RefreshCw, MessageSquare, Brain, Volume2, FileText, Bot } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface StepHealthCheckProps {
  data: OnboardingData;
  results: Record<string, boolean>;
  setResults: (results: Record<string, boolean>) => void;
}

interface CheckItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  check: () => Promise<boolean>;
  optional?: boolean;
}

export function StepHealthCheck({ data, results, setResults }: StepHealthCheckProps) {
  const [checking, setChecking] = useState(false);
  const [currentCheck, setCurrentCheck] = useState<string | null>(null);

  const checks: CheckItem[] = [
    {
      id: 'whatsapp',
      label: 'WhatsApp Business API',
      icon: <MessageSquare className="h-5 w-5" />,
      check: async () => {
        return !!(data.whatsappAccessToken && data.whatsappPhoneNumberId);
      }
    },
    {
      id: 'ai',
      label: 'Provedor de IA',
      icon: <Brain className="h-5 w-5" />,
      check: async () => {
        if (data.aiProvider === 'lovable') return true;
        return !!data.openaiApiKey;
      }
    },
    {
      id: 'elevenlabs',
      label: 'ElevenLabs (Voz)',
      icon: <Volume2 className="h-5 w-5" />,
      optional: true,
      check: async () => {
        if (data.skipElevenlabs) return true;
        return !!(data.elevenlabsApiKey && data.elevenlabsVoiceId);
      }
    },
    {
      id: 'templates',
      label: 'Templates Sincronizados',
      icon: <FileText className="h-5 w-5" />,
      check: async () => {
        const { count } = await supabase
          .from('whatsapp_templates')
          .select('id', { count: 'exact', head: true });
        return (count || 0) > 0;
      }
    },
    {
      id: 'agent',
      label: 'Configuração do Agente',
      icon: <Bot className="h-5 w-5" />,
      check: async () => {
        return !!(data.agentName && data.companyName);
      }
    }
  ];

  const runHealthCheck = async () => {
    setChecking(true);
    const newResults: Record<string, boolean> = {};

    for (const check of checks) {
      setCurrentCheck(check.id);
      try {
        newResults[check.id] = await check.check();
      } catch {
        newResults[check.id] = false;
      }
      // Small delay for visual feedback
      await new Promise(r => setTimeout(r, 300));
    }

    setCurrentCheck(null);
    setResults(newResults);
    setChecking(false);
  };

  useEffect(() => {
    if (Object.keys(results).length === 0) {
      runHealthCheck();
    }
  }, []);

  const allPassed = checks.every(c => c.optional || results[c.id]);
  const passedCount = checks.filter(c => results[c.id]).length;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className={cn(
          "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
          allPassed ? "bg-green-100 dark:bg-green-900/30" : "bg-amber-100 dark:bg-amber-900/30"
        )}>
          {allPassed ? (
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          ) : (
            <RefreshCw className="h-8 w-8 text-amber-600" />
          )}
        </div>
        <h3 className="text-2xl font-semibold">Verificação do Sistema</h3>
        <p className="text-muted-foreground mt-2">
          Validando as configurações realizadas
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Status das Configurações</span>
            <span className="text-sm font-normal text-muted-foreground">
              {passedCount}/{checks.length} verificados
            </span>
          </CardTitle>
          <CardDescription>
            Cada item será verificado automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => {
            const isChecking = currentCheck === check.id;
            const passed = results[check.id];
            const showStatus = !checking || results[check.id] !== undefined;

            return (
              <div
                key={check.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  passed && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                  passed === false && !check.optional && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                  passed === false && check.optional && "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
                  isChecking && "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full",
                    passed && "bg-green-100 dark:bg-green-900/50 text-green-600",
                    passed === false && "bg-muted text-muted-foreground",
                    isChecking && "bg-blue-100 dark:bg-blue-900/50 text-blue-600"
                  )}>
                    {check.icon}
                  </div>
                  <div>
                    <p className="font-medium">{check.label}</p>
                    {check.optional && (
                      <p className="text-xs text-muted-foreground">Opcional</p>
                    )}
                  </div>
                </div>

                <div>
                  {isChecking ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  ) : showStatus && passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : showStatus && passed === false ? (
                    <XCircle className={cn(
                      "h-5 w-5",
                      check.optional ? "text-amber-500" : "text-red-500"
                    )} />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-muted" />
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={runHealthCheck} disabled={checking}>
          <RefreshCw className={cn("h-4 w-4 mr-2", checking && "animate-spin")} />
          Verificar Novamente
        </Button>
      </div>
    </div>
  );
}
