import { useState } from "react";
import { Palette, Image, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ChatBackgroundProps {
  currentBackground?: string;
  onBackgroundChange: (background: string) => void;
}

const backgrounds = [
  { id: 'default', name: 'Padrão', type: 'color', value: '' },
  { id: 'blue', name: 'Azul', type: 'color', value: 'bg-blue-50' },
  { id: 'green', name: 'Verde', type: 'color', value: 'bg-green-50' },
  { id: 'purple', name: 'Roxo', type: 'color', value: 'bg-purple-50' },
  { id: 'pink', name: 'Rosa', type: 'color', value: 'bg-pink-50' },
  { id: 'pattern1', name: 'Padrão 1', type: 'pattern', value: 'bg-gradient-to-br from-blue-50 to-indigo-100' },
  { id: 'pattern2', name: 'Padrão 2', type: 'pattern', value: 'bg-gradient-to-br from-green-50 to-emerald-100' },
  { id: 'pattern3', name: 'Padrão 3', type: 'pattern', value: 'bg-gradient-to-br from-purple-50 to-pink-100' },
];

export function ChatBackground({ currentBackground = '', onBackgroundChange }: ChatBackgroundProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (background: string) => {
    onBackgroundChange(background);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Image className="h-4 w-4" />
            Fundo do chat
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {backgrounds.map((bg) => (
              <div
                key={bg.id}
                className={cn(
                  "relative h-16 rounded-lg border-2 cursor-pointer transition-colors overflow-hidden",
                  currentBackground === bg.value
                    ? "border-primary"
                    : "border-muted hover:border-muted-foreground/50",
                  bg.value || "bg-background"
                )}
                onClick={() => handleSelect(bg.value)}
              >
                {/* Preview content */}
                <div className="absolute inset-1 rounded-md flex flex-col gap-1 p-1">
                  <div className="h-2 bg-primary/20 rounded-full ml-auto w-3/4" />
                  <div className="h-2 bg-muted rounded-full w-2/3" />
                  <div className="h-2 bg-primary/20 rounded-full ml-auto w-1/2" />
                </div>

                {/* Selected indicator */}
                {currentBackground === bg.value && (
                  <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                    <div className="bg-primary rounded-full p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}

                {/* Name label */}
                <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm px-1 py-0.5">
                  <span className="text-xs font-medium">{bg.name}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            O fundo será aplicado apenas para este chat
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}