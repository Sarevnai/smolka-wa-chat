import { MessageSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";

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
      <div className="w-full sm:w-80 md:w-[22rem] lg:w-96 xl:w-[26rem] 2xl:w-[28rem] border-r border-sidebar-border bg-sidebar flex-shrink-0">
        <ChatList 
          selectedContact={selectedContact} 
          onContactSelect={onContactSelect}
        />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center min-w-0 max-w-[1400px] mx-auto w-full">
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
              
              <p className="text-muted-foreground text-center max-w-md text-sm sm:text-base px-4">
                Escolha uma conversa da lista à esquerda para começar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}