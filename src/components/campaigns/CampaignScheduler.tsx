import { useState } from "react";
import { Calendar, Clock, Send, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, addDays, addHours, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CampaignSchedulerProps {
  onSchedule: (scheduledAt: Date | null) => void;
  onSendNow: () => void;
  disabled?: boolean;
}

export default function CampaignScheduler({ onSchedule, onSendNow, disabled }: CampaignSchedulerProps) {
  const [sendOption, setSendOption] = useState<"now" | "schedule">("now");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("09:00");

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const [hours, minutes] = selectedTime.split(":");
      const scheduledDateTime = new Date(date);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (sendOption === "schedule") {
        onSchedule(scheduledDateTime);
      }
    }
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    if (selectedDate && sendOption === "schedule") {
      const [hours, minutes] = time.split(":");
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onSchedule(scheduledDateTime);
    }
  };

  const handleSendOptionChange = (option: "now" | "schedule") => {
    setSendOption(option);
    
    if (option === "now") {
      onSchedule(null);
    } else if (option === "schedule" && selectedDate) {
      const [hours, minutes] = selectedTime.split(":");
      const scheduledDateTime = new Date(selectedDate);
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      onSchedule(scheduledDateTime);
    }
  };

  const getScheduledDateTime = () => {
    if (!selectedDate) return null;
    const [hours, minutes] = selectedTime.split(":");
    const scheduledDateTime = new Date(selectedDate);
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return scheduledDateTime;
  };

  const scheduledDateTime = getScheduledDateTime();
  const isValidSchedule = scheduledDateTime && isAfter(scheduledDateTime, new Date());

  const quickScheduleOptions = [
    {
      label: "Em 1 hora",
      date: addHours(new Date(), 1),
    },
    {
      label: "Amanhã 9h",
      date: (() => {
        const tomorrow = addDays(new Date(), 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      })(),
    },
    {
      label: "Segunda 9h",
      date: (() => {
        const now = new Date();
        const monday = new Date();
        const daysUntilMonday = (1 + 7 - now.getDay()) % 7 || 7;
        monday.setDate(now.getDate() + daysUntilMonday);
        monday.setHours(9, 0, 0, 0);
        return monday;
      })(),
    },
  ];

  const handleQuickSchedule = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(format(date, "HH:mm"));
    setSendOption("schedule");
    onSchedule(date);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Programar Envio
        </CardTitle>
        <CardDescription>
          Escolha quando enviar sua campanha
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <RadioGroup value={sendOption} onValueChange={handleSendOptionChange}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="now" id="now" />
            <Label htmlFor="now" className="flex items-center gap-2 cursor-pointer">
              <Send className="h-4 w-4" />
              Enviar agora
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="schedule" id="schedule" />
            <Label htmlFor="schedule" className="flex items-center gap-2 cursor-pointer">
              <Clock className="h-4 w-4" />
              Agendar envio
            </Label>
          </div>
        </RadioGroup>

        {sendOption === "schedule" && (
          <div className="space-y-4 p-4 bg-muted rounded-md">
            {/* Quick Schedule Options */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Opções rápidas:</Label>
              <div className="flex flex-wrap gap-2">
                {quickScheduleOptions.map((option) => (
                  <Button
                    key={option.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSchedule(option.date)}
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date Picker */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Data:</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP", { locale: ptBR })
                      ) : (
                        "Selecione uma data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => 
                        date < new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div>
                <Label htmlFor="time" className="text-sm font-medium mb-2 block">
                  Horário:
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
              </div>
            </div>

            {/* Schedule Summary */}
            {scheduledDateTime && (
              <div className={cn(
                "p-3 rounded-md border",
                isValidSchedule 
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              )}>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">
                    {isValidSchedule ? "Agendado para:" : "Data/hora inválida:"}
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {format(scheduledDateTime, "PPPP 'às' HH:mm", { locale: ptBR })}
                </p>
                {!isValidSchedule && (
                  <p className="mt-1 text-xs">
                    A data e hora devem ser no futuro
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end">
          {sendOption === "now" ? (
            <Button 
              onClick={onSendNow} 
              disabled={disabled}
              className="bg-gradient-primary"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Agora
            </Button>
          ) : (
            <Button 
              onClick={onSendNow} 
              disabled={disabled || !isValidSchedule}
              variant="outline"
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Agendar Campanha
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}