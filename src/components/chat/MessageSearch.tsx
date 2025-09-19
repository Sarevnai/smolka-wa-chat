import { useState, useEffect, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure animation starts, then focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleClose();
    } else if (e.key === "Enter") {
      if (e.shiftKey) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 bg-card border-b border-border relative z-10",
      isOpen ? "animate-slide-in-from-left" : "animate-slide-out-to-right",
      className
    )}>
      {/* Search input container */}
      <div className="flex-1 relative min-w-0">
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar nas mensagens..."
          className="pr-12 text-sm"
        />
        
        {/* Results counter inside input */}
        {results.length > 0 && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
              {currentIndex + 1}/{results.length}
            </span>
          </div>
        )}
      </div>
      
      {/* Navigation buttons */}
      {results.length > 0 && (
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToPrevious}
            disabled={results.length === 0}
            className="h-8 w-8 p-0 hover:bg-muted/50"
            title="Anterior (Shift+Enter)"
          >
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={goToNext}
            disabled={results.length === 0}
            className="h-8 w-8 p-0 hover:bg-muted/50"
            title="Próximo (Enter)"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
      )}
      
      {/* Close button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleClose}
        className="h-8 w-8 p-0 hover:bg-muted/50"
        title="Fechar (Esc)"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}