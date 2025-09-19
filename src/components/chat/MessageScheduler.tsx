import { useState } from "react";
import { Calendar, Clock, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, addHours, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MessageSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  phoneNumber: string;
  onSchedule: (message: string, scheduledTime: Date) => void;
}

const quickOptions = [
  { label: "Em 1 hora", value: () => addHours(new Date(), 1) },
  { label: "Em 2 horas", value: () => addHours(new Date(), 2) },
  { label: "Amanhã 9h", value: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }},
  { label: "Amanhã 14h", value: () => {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow;
  }},
];

export function MessageScheduler({ isOpen, onClose, phoneNumber, onSchedule }: MessageSchedulerProps) {
  const [message, setMessage] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const handleSchedule = () => {
    if (!message.trim() || !scheduledDate || !scheduledTime) return;

    const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    onSchedule(message, dateTime);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setMessage("");
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleQuickOption = (option: typeof quickOptions[0]) => {
    const dateTime = option.value();
    setScheduledDate(format(dateTime, 'yyyy-MM-dd'));
    setScheduledTime(format(dateTime, 'HH:mm'));
  };

  const isValidSchedule = () => {
    if (!scheduledDate || !scheduledTime) return false;
    const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    return dateTime > new Date();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Agendar mensagem
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact info */}
          <div className="text-sm text-muted-foreground">
            Para: <span className="font-medium">{phoneNumber}</span>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Quick options */}
          <div className="space-y-2">
            <Label>Opções rápidas</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickOptions.map((option, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickOption(option)}
                  className="text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date/time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="time">Horário</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {scheduledDate && scheduledTime && (
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(new Date(`${scheduledDate}T${scheduledTime}`), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            
            <Button 
              onClick={handleSchedule}
              disabled={!message.trim() || !isValidSchedule()}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              Agendar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}