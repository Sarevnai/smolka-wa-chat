import { useState } from 'react';
import { Filter, X, Star, AlertCircle, Flag, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useMessageFlags, type FlagType } from '@/hooks/useMessageFlags';

interface MessageFlagsFilterProps {
  onFilterChange: (flagTypes: FlagType[]) => void;
  phoneNumber?: string;
}

const flagConfig = {
  important: {
    icon: AlertCircle,
    label: 'Importante',
    color: 'text-orange-500',
  },
  starred: {
    icon: Star,
    label: 'Favorito',
    color: 'text-yellow-500',
  },
  priority: {
    icon: Zap,
    label: 'Alta Prioridade',
    color: 'text-red-500',
  },
  unread: {
    icon: Flag,
    label: 'Não Lida',
    color: 'text-blue-500',
  },
};

export function MessageFlagsFilter({ onFilterChange, phoneNumber }: MessageFlagsFilterProps) {
  const [selectedFlags, setSelectedFlags] = useState<FlagType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { getFlagCounts } = useMessageFlags(phoneNumber);
  
  const flagCounts = getFlagCounts();

  const handleFlagToggle = (flagType: FlagType, checked: boolean) => {
    const newSelectedFlags = checked
      ? [...selectedFlags, flagType]
      : selectedFlags.filter(f => f !== flagType);
    
    setSelectedFlags(newSelectedFlags);
    onFilterChange(newSelectedFlags);
  };

  const clearFilters = () => {
    setSelectedFlags([]);
    onFilterChange([]);
  };

  const hasActiveFilters = selectedFlags.length > 0;

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={hasActiveFilters ? "border-primary" : ""}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtrar
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                {selectedFlags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Filtrar por marcações</h4>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 px-2 text-xs"
                >
                  Limpar
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
              {Object.entries(flagConfig).map(([flagType, config]) => {
                const count = flagCounts[flagType as FlagType] || 0;
                const Icon = config.icon;
                
                return (
                  <div key={flagType} className="flex items-center space-x-2">
                    <Checkbox
                      id={flagType}
                      checked={selectedFlags.includes(flagType as FlagType)}
                      onCheckedChange={(checked) =>
                        handleFlagToggle(flagType as FlagType, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={flagType}
                      className="flex items-center gap-2 text-sm cursor-pointer flex-1"
                    >
                      <Icon className={`h-3 w-3 ${config.color}`} />
                      <span>{config.label}</span>
                      <Badge variant="outline" className="ml-auto h-4 px-1 text-xs">
                        {count}
                      </Badge>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {hasActiveFilters && (
        <div className="flex items-center gap-1">
          {selectedFlags.map((flagType) => {
            const config = flagConfig[flagType];
            const Icon = config.icon;
            
            return (
              <Badge
                key={flagType}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <Icon className={`h-3 w-3 ${config.color}`} />
                <span className="text-xs">{config.label}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-3 w-3 p-0 hover:bg-accent"
                  onClick={() => handleFlagToggle(flagType, false)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}