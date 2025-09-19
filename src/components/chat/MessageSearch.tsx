import { useState, useEffect } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageRow } from "@/lib/messages";

interface MessageSearchProps {
  messages: MessageRow[];
  isOpen: boolean;
  onClose: () => void;
  onMessageSelect: (messageId: number) => void;
  className?: string;
}

export function MessageSearch({ 
  messages, 
  isOpen, 
  onClose, 
  onMessageSelect, 
  className 
}: MessageSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<MessageRow[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    const filtered = messages.filter(message => 
      message.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.media_caption?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    setResults(filtered);
    setCurrentIndex(0);
  }, [searchTerm, messages]);

  const goToNext = () => {
    if (results.length === 0) return;
    const nextIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIndex);
    onMessageSelect(results[nextIndex].id);
  };

  const goToPrevious = () => {
    if (results.length === 0) return;
    const prevIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    onMessageSelect(results[prevIndex].id);
  };

  const handleClose = () => {
    setSearchTerm("");
    setResults([]);
    setCurrentIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "absolute top-0 left-0 right-0 z-10 bg-card border-b border-border",
      "animate-slide-down",
      className
    )}>
      <div className="flex items-center gap-2 p-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nas mensagens..."
            className="pl-10 pr-4"
            autoFocus
          />
        </div>
        
        {results.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} de {results.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToPrevious}
              disabled={results.length === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goToNext}
              disabled={results.length === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClose}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}