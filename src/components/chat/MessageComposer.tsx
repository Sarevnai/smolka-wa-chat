import { useState, KeyboardEvent, useEffect, useRef, useMemo } from "react";
import { Send, User, Crown, X, FileText, Image as ImageIcon, File } from "lucide-react";
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

interface AttachedFile {
  publicUrl: string;
  fileName: string;
  mimeType: string;
  preview?: string;
}

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
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const { profile } = useAuth();
  const { profiles } = useUserProfiles();
  const { sendMediaMessage } = useMediaUpload();

  // Memoize available attendants to prevent infinite re-renders
  const availableAttendants = useMemo(() => {
    const baseAttendants: Array<{ value: string; label: string; role?: 'admin' | 'user' }> = [
      { value: "none", label: "Sem identificação" }
    ];
    
    if (!profile) return baseAttendants;

    // If user is admin, show all users
    if (profile.roles?.includes('admin')) {
      const userAttendants = profiles
        .filter(p => p.full_name)
        .map(p => ({
          value: p.full_name!,
          label: p.full_name!
        }));
      return [...baseAttendants, ...userAttendants];
    }

    // If user is regular user, only show their own name
    if (profile.full_name) {
      return [
        ...baseAttendants,
        { 
          value: profile.full_name, 
          label: profile.full_name
        }
      ];
    }

    return baseAttendants;
  }, [profile, profiles]);

  // Load attendant from localStorage on component mount and set default based on user
  useEffect(() => {
    if (!profile) return;

    const savedAttendant = localStorage.getItem("selectedAttendant");
    
    // If user is not admin and has a name, automatically select their name
    if (!profile.roles?.includes('admin') && profile.full_name) {
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
    if ((message.trim() || attachedFiles.length > 0) && !disabled && !isSending && selectedContact) {
      setIsSending(true);
      
      try {
        let formattedMessage = message.trim();
        
        // Add attendant prefix if an attendant is selected
        if (selectedAttendant && selectedAttendant !== "none") {
          formattedMessage = `*${selectedAttendant}*\n\n${formattedMessage}`;
        }
        
        // Send attached files first
        for (const file of attachedFiles) {
          await sendMediaMessage(
            selectedContact,
            file.publicUrl,
            file.mimeType,
            formattedMessage || undefined,
            file.fileName
          );
        }
        
        // If there are no files but there's a message, send text message
        if (attachedFiles.length === 0 && formattedMessage) {
          await onSendMessage(formattedMessage);
        }
        
        // Clear message and attachments
        setMessage("");
        setAttachedFiles([]);
        
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
    const newFile: AttachedFile = {
      publicUrl: uploadResult.publicUrl,
      fileName: uploadResult.fileName,
      mimeType: uploadResult.mimeType,
    };

    // Create preview for images
    if (uploadResult.mimeType.startsWith('image/')) {
      newFile.preview = uploadResult.publicUrl;
    }

    setAttachedFiles(prev => [...prev, newFile]);
    
    toast({
      title: "Arquivo anexado",
      description: `${uploadResult.fileName} foi anexado. Pressione Enter para enviar.`,
    });
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAudioReady = (audioBlob: Blob, duration: number) => {
    toast({
      title: "Áudio gravado",
      description: `Áudio de ${Math.floor(duration)}s está pronto para envio.`,
    });
    // Here you would typically upload the audio and send it as a message
    // onSendMessage(`[Áudio: ${Math.floor(duration)}s]`);
  };

  const hasContent = message.trim().length > 0 || attachedFiles.length > 0;

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return ImageIcon;
    return FileText;
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Compact Attendant Selector - Only show for admins or when needed */}
      {(profile?.roles?.includes('admin') || availableAttendants.length > 1) && (
        <div className="flex items-center gap-2 px-1">
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select 
            value={selectedAttendant} 
            onValueChange={setSelectedAttendant} 
            disabled={disabled || (!profile?.roles?.includes('admin') && Boolean(profile?.full_name))}
          >
            <SelectTrigger className="h-8 min-w-[200px] max-w-[280px] text-sm bg-muted/50 border-muted-foreground/20 rounded-md">
              <SelectValue placeholder="Selecione o atendente" />
            </SelectTrigger>
            <SelectContent className="max-w-[280px]">
              {availableAttendants.map((attendant) => {
                const attendantProfile = profiles.find(p => p.full_name === attendant.label);
                return (
                  <SelectItem key={attendant.value} value={attendant.value} className="cursor-pointer">
                    <div className="flex items-center gap-2 w-full justify-between">
                      <span className="text-sm truncate">{attendant.label}</span>
                      {attendantProfile?.username && (
                        <span className="text-xs text-muted-foreground font-mono">
                          @{attendantProfile.username}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Attached Files Preview */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-2">
          {attachedFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.mimeType);
            return (
              <div
                key={index}
                className="flex items-center gap-2 bg-muted rounded-lg p-2 pr-1 animate-slide-in-from-left"
              >
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.fileName}
                    className="w-8 h-8 object-cover rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-muted-foreground/10 rounded flex items-center justify-center">
                    <FileIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-xs font-medium max-w-[120px] truncate">
                  {file.fileName}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeAttachedFile(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
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
            placeholder={attachedFiles.length > 0 ? "Adicione uma legenda (opcional)..." : "Digite uma mensagem..."}
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

        {/* Send button - show when there's content */}
        {hasContent && (
          <Button
            onClick={handleSend}
            disabled={!hasContent || disabled || isSending}
            size="sm"
            className={cn(
              "h-8 w-8 p-0 shrink-0 rounded-full",
              "bg-primary hover:bg-primary/90 text-white",
              "transition-all duration-200 animate-scale-in",
              (!hasContent || disabled || isSending) && "opacity-50"
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