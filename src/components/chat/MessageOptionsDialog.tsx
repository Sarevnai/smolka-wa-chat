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
  UserX
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
      show: deletionPermissions.canDeleteForMe && !!onDeleteForMe
    },
    {
      icon: Trash2,
      label: "Excluir para todos",
      action: onDeleteForEveryone ? () => handleAction(() => onDeleteForEveryone(message)) : undefined,
      show: deletionPermissions.canDeleteForEveryone && !!onDeleteForEveryone
    }
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-80 p-0 bg-background border border-border rounded-2xl shadow-lg">
        <div className="py-2">
          {!showDeleteOptions ? (
            <>
              {menuItems
                .filter(item => item.show)
                .map((item, index, filteredItems) => (
                  <div key={item.label}>
                    <Button
                      variant="ghost"
          className={cn(
            "w-full justify-start h-12 px-6 rounded-none text-foreground hover:bg-muted/50 focus:bg-muted/50 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            item.className
          )}
          aria-label={item.label}
                      onClick={item.action}
                    >
                      <item.icon className="mr-4 h-5 w-5" />
                      <span className="text-base">{item.label}</span>
                    </Button>
                    {index < filteredItems.length - 1 && (
                      <Separator className="mx-6" />
                    )}
                  </div>
                ))}
            </>
          ) : (
            <>
              <div className="px-6 py-3">
                <h3 className="text-lg font-medium text-foreground">Apagar mensagem</h3>
              </div>
              <Separator />
              {!deletionPermissions.canDeleteForEveryone && deletionPermissions.reasonForEveryone && (
                <div className="px-6 py-2 text-xs text-muted-foreground border-l-4 border-yellow-400 bg-yellow-50/20 rounded-r">
                  ⚠️ {deletionPermissions.reasonForEveryone}
                </div>
              )}
              {deleteOptions
                .filter(option => option.show)
                .map((option, index, filteredOptions) => (
                  <div key={option.label}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-6 rounded-none text-destructive hover:bg-destructive/10 focus:bg-destructive/10 transition-colors focus:outline-none focus:ring-2 focus:ring-destructive/20"
                      aria-label={option.label}
                      onClick={option.action}
                    >
                      <option.icon className="mr-4 h-5 w-5" />
                      <span className="text-base">{option.label}</span>
                    </Button>
                    {index < filteredOptions.length - 1 && (
                      <Separator className="mx-6" />
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