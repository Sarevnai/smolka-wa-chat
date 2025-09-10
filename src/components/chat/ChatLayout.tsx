import { useState } from "react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChatList } from "./ChatList";
import { ChatWindow } from "./ChatWindow";
import { NameSuggestionsPanel } from "@/components/contacts/NameSuggestionsPanel";
import { useIsMobile } from "@/hooks/use-mobile";

interface ChatLayoutProps {
  selectedContact?: string;
  onContactSelect: (phoneNumber: string) => void;
}

export function ChatLayout({ selectedContact, onContactSelect }: ChatLayoutProps) {
  const isMobile = useIsMobile();

  // On mobile, show only chat list if no contact selected, otherwise show chat window
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        {!selectedContact ? (
          <ChatList onContactSelect={onContactSelect} selectedContact={selectedContact} />
        ) : (
          <ChatWindow 
            phoneNumber={selectedContact} 
            onBack={() => onContactSelect("")}
          />
        )}
      </div>
    );
  }

  // Desktop: Split screen layout
  return (
    <div className="h-screen">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
          <ChatList onContactSelect={onContactSelect} selectedContact={selectedContact} />
        </ResizablePanel>
        
        <ResizableHandle withHandle />
        
        <ResizablePanel defaultSize={70}>
          {selectedContact ? (
            <ChatWindow phoneNumber={selectedContact} />
          ) : (
            <div className="h-full flex items-center justify-center bg-muted/20 p-6">
              <div className="max-w-md w-full space-y-6">
                <NameSuggestionsPanel />
                
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                    <svg
                      className="w-12 h-12 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Selecione uma conversa
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Escolha um contato da lista para iniciar ou continuar a conversa
                  </p>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}