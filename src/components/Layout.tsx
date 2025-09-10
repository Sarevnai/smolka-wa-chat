import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Send, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">
                Smolka WhatsApp Inbox
              </h1>
            </div>
            
            {/* Live indicator */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-live-indicator animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <Link
              to="/"
              className={cn(
                "flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors",
                location.pathname === "/"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            <Link
              to="/inbox"
              className={cn(
                "flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors",
                location.pathname === "/inbox"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Inbox</span>
            </Link>
            <Link
              to="/chat"
              className={cn(
                "flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors",
                location.pathname === "/chat" || location.pathname.startsWith('/chat/')
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Chat</span>
            </Link>
            <Link
              to="/send"
              className={cn(
                "flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors",
                location.pathname === "/send"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Send className="h-4 w-4" />
              <span>Enviar</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}