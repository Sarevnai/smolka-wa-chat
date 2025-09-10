import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Send, Home, Inbox, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            {/* Dashboard/Home */}
            <Link
              to="/"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200",
                location.pathname === "/"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Home className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>

            {/* Inbox */}
            <Link
              to="/inbox"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200 relative",
                location.pathname === "/inbox"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Inbox className="h-5 w-5" />
              <span>Inbox</span>
              <Badge 
                variant="secondary" 
                className={cn(
                  "ml-2 text-xs px-2 py-0.5",
                  location.pathname === "/inbox" 
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-primary/10 text-primary"
                )}
              >
                New
              </Badge>
            </Link>

            {/* Conversas */}
            <Link
              to="/chat"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200",
                location.pathname === "/chat" || location.pathname.startsWith('/chat/')
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Conversas</span>
            </Link>

            {/* Enviar Mensagem */}
            <Link
              to="/send"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200",
                location.pathname === "/send"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Send className="h-5 w-5" />
              <span>Enviar</span>
            </Link>

            {/* Contatos - Nova seção CRM */}
            <Link
              to="/contacts"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200",
                location.pathname === "/contacts"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Users className="h-5 w-5" />
              <span>Contatos</span>
            </Link>

            {/* Relatórios - Nova seção CRM */}
            <Link
              to="/reports"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200",
                location.pathname === "/reports"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <BarChart3 className="h-5 w-5" />
              <span>Relatórios</span>
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