import { useState } from "react";
import { 
  Reply, 
  Heart, 
  Star, 
  Pin, 
  Forward, 
  Copy, 
  Flag, 
  Trash2, 
  CheckSquare,
  UserX,
  AlertCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageRow } from "@/lib/messages";
import { cn } from "@/lib/utils";
import { MessageDeletionPermissions, getMessageDeletionPermissions } from "./MessageDeletionRules";

interface MessageOptionsDialogProps {
  message: MessageRow;
  children: React.ReactNode;
  onReply?: (message: MessageRow) => void;
  onReact?: (message: MessageRow, emoji: string) => void;
  onStar?: (message: MessageRow) => void;
  onPin?: (message: MessageRow) => void;
  onForward?: (message: MessageRow) => void;
  onCopy?: (message: MessageRow) => void;
  onReport?: (message: MessageRow) => void;
  onDeleteForMe?: (message: MessageRow) => void;
  onDeleteForEveryone?: (message: MessageRow) => void;
  onSelectMessage?: (message: MessageRow) => void;
}

export function MessageOptionsDialog({
  message,
  children,
  onReply,
  onReact,
  onStar,
  onPin,
  onForward,
  onCopy,
  onReport,
  onDeleteForMe,
  onDeleteForEveryone,
  onSelectMessage
}: MessageOptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);
  
  const isOutbound = message.direction === "outbound";
  const hasMedia = message.media_type && message.media_type !== 'text';
  
  // Get deletion permissions based on message rules
  const deletionPermissions = getMessageDeletionPermissions(message);

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
    setShowDeleteOptions(false);
  };

  const handleDeleteClick = () => {
    if (deletionPermissions.canDeleteForEveryone && onDeleteForEveryone) {
      setShowDeleteOptions(true);
    } else if (deletionPermissions.canDeleteForMe && onDeleteForMe) {
      handleAction(() => onDeleteForMe(message));
    }
  };

  const menuItems = [
    {
      icon: Reply,
      label: "Responder",
      action: onReply ? () => handleAction(() => onReply(message)) : undefined,
      show: !!onReply
    },
    {
      icon: Heart,
      label: "Reagir",
      action: onReact ? () => handleAction(() => onReact(message, "❤️")) : undefined,
      show: !!onReact
    },
    {
      icon: Star,
      label: "Favoritar",
      action: onStar ? () => handleAction(() => onStar(message)) : undefined,
      show: !!onStar
    },
    {
      icon: Pin,
      label: "Fixar",
      action: onPin ? () => handleAction(() => onPin(message)) : undefined,
      show: !!onPin
    },
    {
      icon: Forward,
      label: "Encaminhar",
      action: onForward ? () => handleAction(() => onForward(message)) : undefined,
      show: !!onForward
    },
    {
      icon: Copy,
      label: "Copiar",
      action: onCopy ? () => handleAction(() => onCopy(message)) : undefined,
      show: !!onCopy && !!message.body
    },
    {
      icon: Flag,
      label: "Denunciar",
      action: onReport ? () => handleAction(() => onReport(message)) : undefined,
      show: !!onReport && !isOutbound
    },
    {
      icon: Trash2,
      label: "Apagar",
      action: handleDeleteClick,
      show: !!(onDeleteForMe || (onDeleteForEveryone && deletionPermissions.canDeleteForEveryone)),
      className: "text-destructive hover:text-destructive"
    },
    {
      icon: CheckSquare,
      label: "Selecionar mensagens",
      action: onSelectMessage ? () => handleAction(() => onSelectMessage(message)) : undefined,
      show: !!onSelectMessage
    }
  ];

  const deleteOptions = [
    {
      icon: UserX,
      label: "Excluir só para mim",
      action: onDeleteForMe ? () => handleAction(() => onDeleteForMe(message)) : undefined,
      show: deletionPermissions.canDeleteForMe && !!onDeleteForMe,
      description: undefined
    },
    {
      icon: Trash2,
      label: "Excluir da plataforma",
      action: onDeleteForEveryone ? () => handleAction(() => onDeleteForEveryone(message)) : undefined,
      show: deletionPermissions.canDeleteForEveryone && !!onDeleteForEveryone,
      description: "Remove da plataforma. O contato ainda verá no WhatsApp dele."
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-80 p-0 bg-background border border-border rounded-2xl shadow-lg overflow-hidden">
        <div className="flex flex-col">
          {!showDeleteOptions ? (
            <>
              {menuItems
                .filter(item => item.show)
                .map((item, index, filteredItems) => (
                  <div key={item.label}>
                    <Button
                      variant="ghost"
          className={cn(
            "w-full justify-start h-12 px-4 rounded-none text-foreground hover:bg-muted/50 focus:bg-muted/50 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            item.className
          )}
          aria-label={item.label}
                      onClick={item.action}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      <span className="text-base">{item.label}</span>
                    </Button>
                    {index < filteredItems.length - 1 && (
                      <Separator />
                    )}
                  </div>
                ))}
            </>
          ) : (
            <>
              <div className="px-4 py-3">
                <h3 className="text-lg font-medium text-foreground">Apagar mensagem</h3>
              </div>
              <Separator />
              {isOutbound && deletionPermissions.canDeleteForEveryone && (
                <div className="px-4 py-3 text-xs text-muted-foreground bg-muted/30 border-l-4 border-blue-400">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-400" />
                    <div>
                      <p className="font-medium text-foreground mb-1">⚠️ Limitação da API do WhatsApp</p>
                      <p>Mensagens enviadas via API não podem ser excluídas do WhatsApp do destinatário. A exclusão só afeta a visualização na plataforma.</p>
                    </div>
                  </div>
                </div>
              )}
              {!deletionPermissions.canDeleteForEveryone && deletionPermissions.reasonForEveryone && (
                <div className="px-4 py-2 text-xs text-muted-foreground border-l-4 border-yellow-400 bg-yellow-50/20 rounded-r">
                  ⚠️ {deletionPermissions.reasonForEveryone}
                </div>
              )}
              {deleteOptions
                .filter(option => option.show)
                .map((option, index, filteredOptions) => (
                  <div key={option.label}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-auto min-h-12 px-4 py-3 rounded-none text-destructive hover:bg-destructive/10 focus:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/20"
                      aria-label={option.label}
                      onClick={option.action}
                    >
                      <option.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-base">{option.label}</span>
                        {option.description && (
                          <span className="text-xs text-muted-foreground mt-0.5">{option.description}</span>
                        )}
                      </div>
                    </Button>
                    {index < filteredOptions.length - 1 && (
                      <Separator />
                    )}
                  </div>
                ))}
              <Separator />
              <Button
                variant="ghost"
                className="w-full justify-center h-12 rounded-none text-muted-foreground hover:bg-muted/50 focus:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label="Cancelar exclusão"
                onClick={() => setShowDeleteOptions(false)}
              >
                Cancelar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}