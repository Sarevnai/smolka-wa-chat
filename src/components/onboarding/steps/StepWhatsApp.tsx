import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, ExternalLink } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';
import { Button } from '@/components/ui/button';

interface StepWhatsAppProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export function StepWhatsApp({ data, updateData }: StepWhatsAppProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <MessageSquare className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold">Configurar WhatsApp Business API</h3>
        <p className="text-muted-foreground mt-2">
          Conecte sua conta do WhatsApp Business para enviar e receber mensagens
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credenciais da API</CardTitle>
          <CardDescription>
            Obtenha essas informações no{' '}
            <Button variant="link" className="p-0 h-auto" asChild>
              <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer">
                Meta for Developers <ExternalLink className="h-3 w-3 ml-1 inline" />
              </a>
            </Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsappAccessToken">
              Access Token <span className="text-destructive">*</span>
            </Label>
            <Input
              id="whatsappAccessToken"
              type="password"
              placeholder="EAAG..."
              value={data.whatsappAccessToken}
              onChange={(e) => updateData({ whatsappAccessToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Token de acesso permanente da API do WhatsApp
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappPhoneNumberId">
              Phone Number ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="whatsappPhoneNumberId"
              placeholder="1234567890..."
              value={data.whatsappPhoneNumberId}
              onChange={(e) => updateData({ whatsappPhoneNumberId: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ID do número de telefone registrado no WhatsApp Business
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsappVerifyToken">Verify Token (Webhook)</Label>
            <Input
              id="whatsappVerifyToken"
              placeholder="seu_token_de_verificacao"
              value={data.whatsappVerifyToken}
              onChange={(e) => updateData({ whatsappVerifyToken: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Token usado para verificar o webhook (opcional, mas recomendado)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">💡 Como obter as credenciais?</h4>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
          <li>Acesse o Meta for Developers e crie um app</li>
          <li>Adicione o produto "WhatsApp" ao seu app</li>
          <li>Na seção "Configuração da API", copie o Access Token</li>
          <li>O Phone Number ID está na mesma página</li>
        </ol>
      </div>
    </div>
  );
}
