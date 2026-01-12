import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, 
  Megaphone, 
  FileText, 
  Users, 
  Clock, 
  Send, 
  Calendar as CalendarIcon,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageTemplate } from "@/types/campaign";
import { WhatsAppTemplate, getTemplatePreview, isOfficialWhatsAppTemplate } from "@/hooks/useWhatsAppTemplates";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface StepReviewProps {
  campaignName: string;
  campaignDescription: string;
  selectedTemplate: MessageTemplate | WhatsAppTemplate | null;
  customMessage: string;
  selectedContacts: Set<string>;
  selectedListName: string | null;
  scheduledAt: Date | null;
  onScheduledAtChange: (date: Date | null) => void;
  validationErrors: string[];
}

export default function StepReview({
  campaignName,
  campaignDescription,
  selectedTemplate,
  customMessage,
  selectedContacts,
  selectedListName,
  scheduledAt,
  onScheduledAtChange,
  validationErrors,
}: StepReviewProps) {
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>(scheduledAt ? 'scheduled' : 'now');
  const [time, setTime] = useState(scheduledAt ? format(scheduledAt, 'HH:mm') : '09:00');
  const [contactNames, setContactNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchContactNames = async () => {
      if (selectedContacts.size === 0) return;
      
      const { data } = await supabase
        .from('contacts')
        .select('name, phone')
        .in('id', Array.from(selectedContacts))
        .limit(5);
      
      if (data) {
        setContactNames(data.map(c => c.name || c.phone).slice(0, 5));
      }
    };
    
    fetchContactNames();
  }, [selectedContacts]);

  const getMessage = () => {
    if (selectedTemplate) {
      if (isOfficialWhatsAppTemplate(selectedTemplate)) {
        return getTemplatePreview(selectedTemplate) || selectedTemplate.template_name;
      } else if ('content' in selectedTemplate) {
        return selectedTemplate.content;
      }
    }
    return customMessage;
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = time.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
      onScheduledAtChange(date);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (scheduledAt) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const newDate = new Date(scheduledAt);
      newDate.setHours(hours, minutes, 0, 0);
      onScheduledAtChange(newDate);
    }
  };

  const handleSendModeChange = (mode: 'now' | 'scheduled') => {
    setSendMode(mode);
    if (mode === 'now') {
      onScheduledAtChange(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold">Revisar Campanha</h2>
        <p className="text-muted-foreground mt-1">
          Verifique os detalhes antes de enviar
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Campaign Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-primary" />
              Campanha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold text-lg">{campaignName || "Sem nome"}</p>
            {campaignDescription && (
              <p className="text-sm text-muted-foreground mt-1">{campaignDescription}</p>
            )}
          </CardContent>
        </Card>

        {/* Template/Message */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <div>
                <Badge variant="secondary" className="mb-2">
                  {isOfficialWhatsAppTemplate(selectedTemplate) 
                    ? 'Template WhatsApp' 
                    : 'Template Interno'}
                </Badge>
                <p className="font-medium">
                  {isOfficialWhatsAppTemplate(selectedTemplate) 
                    ? selectedTemplate.template_name 
                    : selectedTemplate.name}
                </p>
              </div>
            ) : (
              <p className="text-sm">Mensagem personalizada</p>
            )}
          </CardContent>
        </Card>

        {/* Contacts */}
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Destinatários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="text-lg px-3 py-1">
                {selectedContacts.size}
              </Badge>
              <span className="text-muted-foreground">
                contato{selectedContacts.size !== 1 ? 's' : ''} selecionado{selectedContacts.size !== 1 ? 's' : ''}
              </span>
            </div>
            {selectedListName && (
              <p className="text-sm text-muted-foreground mb-2">
                Lista: <span className="font-medium">{selectedListName}</span>
              </p>
            )}
            {contactNames.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {contactNames.map((name, i) => (
                  <Badge key={i} variant="outline">{name}</Badge>
                ))}
                {selectedContacts.size > 5 && (
                  <Badge variant="outline">+{selectedContacts.size - 5} mais</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preview da Mensagem</CardTitle>
          <CardDescription>Como a mensagem aparecerá no WhatsApp</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-[#e5ddd5] dark:bg-zinc-800 rounded-lg p-4">
            <div className="max-w-[80%] bg-white dark:bg-zinc-700 rounded-lg p-3 shadow-sm">
              <p className="text-sm whitespace-pre-wrap">
                {getMessage() || "Nenhuma mensagem configurada"}
              </p>
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(), 'HH:mm')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agendamento
          </CardTitle>
          <CardDescription>Quando deseja enviar a campanha?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={sendMode}
            onValueChange={(v) => handleSendModeChange(v as 'now' | 'scheduled')}
            className="grid grid-cols-2 gap-4"
          >
            <Label
              htmlFor="send-now"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                sendMode === 'now'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="now" id="send-now" />
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Enviar Agora</p>
                  <p className="text-xs text-muted-foreground">Início imediato</p>
                </div>
              </div>
            </Label>

            <Label
              htmlFor="send-scheduled"
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                sendMode === 'scheduled'
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
            >
              <RadioGroupItem value="scheduled" id="send-scheduled" />
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Agendar</p>
                  <p className="text-xs text-muted-foreground">Escolha data e hora</p>
                </div>
              </div>
            </Label>
          </RadioGroup>

          {sendMode === 'scheduled' && (
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
              <div className="flex-1">
                <Label className="mb-2 block">Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledAt 
                        ? format(scheduledAt, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                        : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledAt || undefined}
                      onSelect={handleDateChange}
                      disabled={(date) => date < new Date()}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="w-full sm:w-32">
                <Label className="mb-2 block">Horário</Label>
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {scheduledAt && sendMode === 'scheduled' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Agendado para{" "}
                <strong>
                  {format(scheduledAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </strong>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
