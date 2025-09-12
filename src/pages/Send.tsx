import { useState } from "react";
import { Send as SendIcon, Phone, MessageSquare, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { SUPABASE_PROJECT_URL } from "@/lib/supabaseClient";
import { SendMessageRequest, SendMessageResponse } from "@/types/message";

export default function Send() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber.trim() || !message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o número e a mensagem.",
        variant: "destructive",
      });
      return;
    }

    // Basic phone number validation
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast({
        title: "Número inválido",
        description: "Por favor, insira um número válido com DDI e DDD (ex: 5511999999999).",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const requestData: SendMessageRequest = {
        to: cleanPhone,
        text: message,
      };

      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/send-wa-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      const result: SendMessageResponse = await response.json();

      if (response.ok && result.success) {
        // Clear form
        setPhoneNumber("");
        setMessage("");
      } else {
        throw new Error(result.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleanValue = value.replace(/\D/g, "");
    
    // Format as needed (basic formatting for display)
    if (cleanValue.length >= 13) {
      return cleanValue.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, "+$1 ($2) $3-$4");
    } else if (cleanValue.length >= 11) {
      return cleanValue.replace(/(\d{2})(\d{2})(\d{5})(\d*)/, "+$1 ($2) $3-$4");
    } else if (cleanValue.length >= 10) {
      return cleanValue.replace(/(\d{2})(\d{2})(\d{4})(\d*)/, "+$1 ($2) $3-$4");
    }
    
    return cleanValue;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Enviar Mensagem</h1>
          <p className="text-muted-foreground">
            Envie mensagens diretamente através da API do WhatsApp
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Dica:</strong> Se a janela de 24h não estiver aberta, use <strong>template</strong>; 
            caso contrário, mensagens de texto comuns são permitidas.
          </AlertDescription>
        </Alert>

        {/* Send Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Nova Mensagem</span>
            </CardTitle>
            <CardDescription>
              Preencha os campos abaixo para enviar uma mensagem via WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Para (número com DDI/DDD)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="text"
                    placeholder="5511999999999"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    className="pl-10"
                    disabled={loading}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  Exemplo: 5511999999999 (DDI + DDD + número)
                </div>
                {phoneNumber && (
                  <div className="text-xs text-primary">
                    Formatado: {formatPhoneNumber(phoneNumber)}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium text-foreground">
                  Mensagem
                </label>
                <Textarea
                  id="message"
                  placeholder="Digite sua mensagem aqui..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-32 resize-none"
                  disabled={loading}
                />
                <div className="text-xs text-muted-foreground">
                  {message.length}/1000 caracteres
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={loading || !phoneNumber.trim() || !message.trim()}
                  className="bg-gradient-primary"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <SendIcon className="h-4 w-4 mr-2" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>
                <strong>Janela de 24 horas:</strong> Você pode enviar mensagens de texto livres apenas 
                dentro de 24 horas após receber uma mensagem do usuário.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>
                <strong>Templates:</strong> Para iniciar conversas ou após o período de 24h, 
                utilize templates aprovados pela Meta.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <p>
                <strong>Formato do número:</strong> Use o formato internacional completo 
                (DDI + DDD + número) sem símbolos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}