import { useState, KeyboardEvent, useEffect, useRef } from "react";
import { Send, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfiles } from "@/hooks/useUserProfiles";
import { EmojiPicker } from "./EmojiPicker";
import { AttachmentUploader } from "./AttachmentUploader";
import { AudioRecorder } from "./AudioRecorder";
import { toast } from "@/hooks/use-toast";
import { MessageRow } from "@/lib/messages";
import { useMediaUpload } from "@/hooks/useMediaUpload";

interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  replyTo?: MessageRow | null;
  onVoiceRecord?: () => void;
  selectedContact?: string;
}

export function MessageComposer({ 
  onSendMessage, 
  disabled = false, 
  onTypingStart, 
  onTypingStop,
  replyTo,
  onVoiceRecord,
  selectedContact 
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [selectedAttendant, setSelectedAttendant] = useState("none");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { profile } = useAuth();
  const { profiles } = useUserProfiles();
  const { sendMediaMessage } = useMediaUpload();

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

  const handleSend = async () => {
    if (message.trim() && !disabled && !isSending) {
      setIsSending(true);
      
      try {
        let formattedMessage = message.trim();
        
        // Add attendant prefix if an attendant is selected
        if (selectedAttendant && selectedAttendant !== "none") {
          formattedMessage = `*${selectedAttendant}*\n\n${formattedMessage}`;
        }
        
        await onSendMessage(formattedMessage);
        setMessage("");
        
        // Focus back to textarea
        setTimeout(() => textareaRef.current?.focus(), 100);
        
      } catch (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Erro ao enviar mensagem",
          description: "Tente novamente em alguns instantes.",
          variant: "destructive",
        });
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    
    // Handle typing indicators
    if (onTypingStart && value.length > 0) {
      onTypingStart();
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        onTypingStop?.();
      }, 1000);
    } else if (onTypingStop && value.length === 0) {
      onTypingStop();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = message;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    setMessage(before + emoji + after);
    
    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleFileUpload = async (uploadResult: { publicUrl: string; fileName: string; mimeType: string }) => {
    if (!selectedContact) {
      toast({
        title: "Erro",
        description: "Nenhum contato selecionado para envio.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      // Add attendant prefix to caption if needed
      let caption = message.trim();
      if (selectedAttendant && selectedAttendant !== "none") {
        caption = `*${selectedAttendant}*\n\n${caption}`;
      }

      const success = await sendMediaMessage(
        selectedContact,
        uploadResult.publicUrl,
        uploadResult.mimeType,
        caption || undefined,
        uploadResult.fileName
      );

      if (success) {
        setMessage("");
        toast({
          title: "Arquivo enviado",
          description: `${uploadResult.fileName} foi enviado com sucesso.`,
        });
      }
    } catch (error) {
      console.error('Error sending media:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleAudioReady = (audioBlob: Blob, duration: number) => {
    toast({
      title: "Áudio gravado",
      description: `Áudio de ${Math.floor(duration)}s está pronto para envio.`,
    });
    // Here you would typically upload the audio and send it as a message
    // onSendMessage(`[Áudio: ${Math.floor(duration)}s]`);
  };

  const isTextMessage = message.trim().length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Compact Attendant Selector - Only show for admins or when needed */}
      {(profile?.role === 'admin' || availableAttendants.length > 1) && (
        <div className="flex items-center gap-2 px-1">
          <User className="h-3 w-3 text-muted-foreground shrink-0" />
          <Select 
            value={selectedAttendant} 
            onValueChange={setSelectedAttendant} 
            disabled={disabled || (profile?.role !== 'admin' && Boolean(profile?.full_name))}
          >
            <SelectTrigger className="h-6 w-36 text-xs bg-muted/50 border-muted-foreground/20 rounded-md">
              <SelectValue placeholder="Atendente" />
            </SelectTrigger>
            <SelectContent>
              {availableAttendants.map((attendant) => (
                <SelectItem key={attendant.value} value={attendant.value}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{attendant.label}</span>
                    {attendant.role === 'admin' && (
                      <Crown className="h-2 w-2 text-yellow-500" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* WhatsApp Message Input - Fixed Height */}
      <div className="flex items-end gap-2 bg-white rounded-3xl p-2 shadow-sm border border-gray-200 min-h-[44px]">
        {/* Attachment uploader */}
        <AttachmentUploader
          onFileUpload={handleFileUpload}
          disabled={disabled || isSending}
        />

        {/* Message input */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite uma mensagem..."
            className={cn(
              "min-h-[28px] max-h-[80px] resize-none border-0 bg-transparent py-1.5 px-0",
              "focus:ring-0 focus:border-0 placeholder:text-muted-foreground/70 text-sm",
              "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted-foreground/20"
            )}
            disabled={disabled}
          />
        </div>
        
        {/* Emoji picker */}
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          disabled={disabled}
        />

        {/* Send button - only show when there's text */}
        {isTextMessage && (
          <Button
            onClick={handleSend}
            disabled={!message.trim() || disabled || isSending}
            size="sm"
            className={cn(
              "h-8 w-8 p-0 shrink-0 rounded-full",
              "bg-primary hover:bg-primary/90 text-white",
              "transition-all duration-200 animate-scale-in",
              (!message.trim() || disabled || isSending) && "opacity-50"
            )}
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}