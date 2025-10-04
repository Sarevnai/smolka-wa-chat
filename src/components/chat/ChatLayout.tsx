import { MessageSquare, SparklesIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { NameSuggestionsPanel } from "@/components/contacts/NameSuggestionsPanel";

interface ChatLayoutProps {
  selectedContact?: string;
  onContactSelect: (phoneNumber: string) => void;
}

export function ChatLayout({ selectedContact, onContactSelect }: ChatLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="h-screen w-full">
        {selectedContact ? (
          <ChatWindow phoneNumber={selectedContact} onBack={() => onContactSelect("")} />
        ) : (
          <ChatList selectedContact={selectedContact} onContactSelect={onContactSelect} />
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex">
      {/* Responsive sidebar */}
      <div className="w-full sm:w-80 lg:w-96 xl:w-[28rem] border-r border-sidebar-border bg-sidebar flex-shrink-0">
        <ChatList 
          selectedContact={selectedContact} 
          onContactSelect={onContactSelect}
        />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-w-0">
        {selectedContact ? (
          <ChatWindow phoneNumber={selectedContact} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-chat-background">
            <div className="flex flex-col items-center max-w-2xl w-full animate-fade-in">
              {/* Icon and heading */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 shadow-sm">
                <MessageSquare className="h-14 w-14 text-primary/70" />
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3 text-center">
                Selecione uma conversa
              </h2>
              
              <p className="text-muted-foreground text-center max-w-md mb-8 text-sm sm:text-base px-4">
                Escolha uma conversa da lista à esquerda para começar ou visualize sugestões de nomes abaixo
              </p>
              
              {/* Name suggestions with better integration */}
              <div className="w-full max-w-3xl">
                <div className="mb-4 px-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4" />
                    Sugestões de Nomes Detectados
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Estes contatos foram identificados automaticamente em suas conversas
                  </p>
                </div>
                <NameSuggestionsPanel />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}