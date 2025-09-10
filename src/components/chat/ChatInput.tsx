import { useState, KeyboardEvent, useEffect } from "react";
import { Send, Paperclip, Smile, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

const attendants = [
  { value: "none", label: "Sem identificação" },
  { value: "Giselle", label: "Giselle" },
  { value: "Denny", label: "Denny" }
];

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedAttendant, setSelectedAttendant] = useState("none");

  // Load attendant from localStorage on component mount
  useEffect(() => {
    const savedAttendant = localStorage.getItem("selectedAttendant");
    if (savedAttendant && savedAttendant !== "") {
      setSelectedAttendant(savedAttendant);
    } else {
      setSelectedAttendant("none");
    }
  }, []);

  // Save attendant to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("selectedAttendant", selectedAttendant);
  }, [selectedAttendant]);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      let formattedMessage = message.trim();
      
      // Add attendant prefix if an attendant is selected
      if (selectedAttendant && selectedAttendant !== "none") {
        formattedMessage = `*${selectedAttendant}*\n\n${formattedMessage}`;
      }
      
      onSendMessage(formattedMessage);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Attendant Selector */}
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={selectedAttendant} onValueChange={setSelectedAttendant} disabled={disabled}>
          <SelectTrigger className="w-48 h-8">
            <SelectValue placeholder="Selecionar atendente" />
          </SelectTrigger>
          <SelectContent>
            {attendants.map((attendant) => (
              <SelectItem key={attendant.value} value={attendant.value}>
                {attendant.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedAttendant && selectedAttendant !== "none" && (
          <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
            <User className="h-3 w-3" />
            <span>{selectedAttendant}</span>
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="flex items-end gap-3">
        {/* Attachment button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 shrink-0"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        </Button>

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className={cn(
              "min-h-[40px] max-h-[100px] resize-none rounded-2xl pr-12 py-3",
              "border border-border bg-background",
              "focus:ring-1 focus:ring-primary focus:border-primary"
            )}
            disabled={disabled}
          />
          
          {/* Emoji button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
            disabled={disabled}
          >
            <Smile className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          size="sm"
          className={cn(
            "h-10 w-10 p-0 shrink-0 rounded-full",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            (!message.trim() || disabled) && "opacity-50"
          )}
        >
          {disabled ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}