import { Star, AlertCircle, Flag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMessageFlags, type FlagType } from '@/hooks/useMessageFlags';
import { cn } from '@/lib/utils';

interface MessageFlagsProps {
  messageId: number;
  className?: string;
  showLabels?: boolean;
}

const flagConfig = {
  important: {
    icon: AlertCircle,
    label: 'Importante',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 text-orange-800',
  },
  starred: {
    icon: Star,
    label: 'Favorito',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 text-yellow-800',
  },
  priority: {
    icon: Zap,
    label: 'Alta Prioridade',
    color: 'text-red-500',
    bgColor: 'bg-red-100 text-red-800',
  },
  unread: {
    icon: Flag,
    label: 'Não Lida',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 text-blue-800',
  },
};

export function MessageFlags({ messageId, className, showLabels = false }: MessageFlagsProps) {
  const { getMessageFlags, hasFlag, toggleFlag } = useMessageFlags();
  const messageFlags = getMessageFlags(messageId);

  const handleToggleFlag = (flagType: FlagType) => {
    toggleFlag(messageId, flagType);
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TooltipProvider>
        {Object.entries(flagConfig).map(([flagType, config]) => {
          const isActive = hasFlag(messageId, flagType as FlagType);
          const Icon = config.icon;
          
          return (
            <Tooltip key={flagType}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 w-6 p-0 hover:bg-accent",
                    isActive && config.color
                  )}
                  onClick={() => handleToggleFlag(flagType as FlagType)}
                >
                  <Icon className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isActive ? `Remover ${config.label}` : `Marcar como ${config.label}`}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
      
      {showLabels && messageFlags.length > 0 && (
        <div className="flex gap-1 ml-2">
          {messageFlags.map((flagType) => (
            <Badge
              key={flagType}
              variant="secondary"
              className={cn("text-xs", flagConfig[flagType].bgColor)}
            >
              {flagConfig[flagType].label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}