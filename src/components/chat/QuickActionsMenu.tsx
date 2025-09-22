import { Ticket, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface QuickActionsMenuProps {
  onCreateTicket: () => void;
  onViewProfile: () => void;
  onDeleteConversation: () => void;
  disabled?: boolean;
}

export function QuickActionsMenu({
  onCreateTicket,
  onViewProfile,
  onDeleteConversation,
  disabled = false
}: QuickActionsMenuProps) {
  const actions = [
    {
      icon: Ticket,
      label: "Criar ticket",
      onClick: onCreateTicket,
      className: "text-primary hover:bg-primary/10"
    },
    {
      icon: User,
      label: "Ver perfil do contato",
      onClick: onViewProfile,
      className: "text-muted-foreground hover:bg-muted"
    },
    {
      icon: Trash2,
      label: "Excluir conversa",
      onClick: onDeleteConversation,
      className: "text-destructive hover:bg-destructive/10"
    }
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 px-1 py-1">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0 rounded-full transition-all duration-200",
                    action.className,
                    disabled && "opacity-50 pointer-events-none"
                  )}
                  onClick={action.onClick}
                  disabled={disabled}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p>{action.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}