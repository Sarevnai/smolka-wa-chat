import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, RefreshCw, CheckCircle2, Loader2 } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StepTemplatesProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepTemplates({ data, updateData }: StepTemplatesProps) {
  const [syncing, setSyncing] = useState(false);

  const syncTemplates = async () => {
    setSyncing(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('sync-whatsapp-templates');
      
      if (error) throw error;
      
      if (response?.success) {
        // Recount templates
        const { count } = await supabase
          .from('whatsapp_templates')
          .select('id', { count: 'exact', head: true });
        
        updateData({ 
          templatesSynced: true, 
          templatesCount: count || 0 
        });
        toast.success(`${count} templates sincronizados com sucesso!`);
      } else {
        throw new Error(response?.error || 'Erro ao sincronizar');
      }
    } catch (error: any) {
      console.error('Error syncing templates:', error);
      toast.error(error.message || 'Erro ao sincronizar templates');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold">Sincronizar Templates</h3>
        <p className="text-muted-foreground mt-2">
          Importe os templates aprovados do WhatsApp Business
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Templates do WhatsApp</CardTitle>
          <CardDescription>
            Templates são mensagens pré-aprovadas pela Meta para iniciar conversas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.templatesSynced ? (
            <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                Templates Sincronizados!
              </h4>
              <p className="text-green-700 dark:text-green-300 mt-1">
                {data.templatesCount} template{data.templatesCount !== 1 ? 's' : ''} encontrado{data.templatesCount !== 1 ? 's' : ''}
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={syncTemplates}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar Novamente
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">
                Nenhum template sincronizado ainda
              </p>
              <Button onClick={syncTemplates} disabled={syncing}>
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar Templates
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">📋 Sobre Templates</h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Templates são necessários para iniciar conversas proativamente</li>
          <li>• Devem ser aprovados pela Meta antes de serem usados</li>
          <li>• Use para campanhas de marketing e notificações</li>
        </ul>
      </div>
    </div>
  );
}
