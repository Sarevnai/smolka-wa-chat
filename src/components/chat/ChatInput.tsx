import { useState, KeyboardEvent, useEffect } from "react";
import { Send, Paperclip, Smile, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfiles } from "@/hooks/useUserProfiles";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedAttendant, setSelectedAttendant] = useState("none");
  const { profile } = useAuth();
  const { profiles } = useUserProfiles();

  // Get available attendants based on user role
  const getAvailableAttendants = () => {
    const baseAttendants: Array<{ value: string; label: string; role?: 'admin' | 'user' }> = [
      { value: "none", label: "Sem identificação" }
    ];
    
    if (!profile) return baseAttendants;

    // If user is admin, show all users
    if (profile.role === 'admin') {
      const userAttendants = profiles
        .filter(p => p.full_name)
        .map(p => ({
          value: p.full_name!,
          label: p.full_name!,
          role: p.role as 'admin' | 'user'
        }));
      return [...baseAttendants, ...userAttendants];
    }

    // If user is regular user, only show their own name
    if (profile.full_name) {
      return [
        ...baseAttendants,
        { 
          value: profile.full_name, 
          label: profile.full_name,
          role: profile.role as 'admin' | 'user'
        }
      ];
    }

    return baseAttendants;
  };

  const availableAttendants = getAvailableAttendants();

  // Load attendant from localStorage on component mount and set default based on user
  useEffect(() => {
    if (!profile) return;

    const savedAttendant = localStorage.getItem("selectedAttendant");
    
    // If user is not admin and has a name, automatically select their name
    if (profile.role !== 'admin' && profile.full_name) {
      setSelectedAttendant(profile.full_name);
      return;
    }

    // For admin users, use saved preference or default to "none"
    if (savedAttendant && savedAttendant !== "") {
      // Check if saved attendant is still valid in current available attendants
      const isValidAttendant = availableAttendants.some(att => att.value === savedAttendant);
      setSelectedAttendant(isValidAttendant ? savedAttendant : "none");
    } else {
      setSelectedAttendant("none");
    }
  }, [profile, availableAttendants]);

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
        <Select 
          value={selectedAttendant} 
          onValueChange={setSelectedAttendant} 
          disabled={disabled || (profile?.role !== 'admin' && Boolean(profile?.full_name))}
        >
          <SelectTrigger className="w-48 h-8">
            <SelectValue placeholder="Selecionar atendente" />
          </SelectTrigger>
          <SelectContent>
            {availableAttendants.map((attendant) => (
              <SelectItem key={attendant.value} value={attendant.value}>
                <div className="flex items-center gap-2">
                  <span>{attendant.label}</span>
                  {attendant.role === 'admin' && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
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