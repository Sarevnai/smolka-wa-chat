import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Send, Home, Inbox, Users, BarChart3, Settings, LogOut, User, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNewMessages } from "@/hooks/useNewMessages";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  const { unreadCount } = useNewMessages();

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

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
            
            {/* Live indicator and User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-live-indicator animate-pulse" />
                <span className="text-sm font-medium text-muted-foreground">Live</span>
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name || user?.user_metadata?.full_name || 'Usuário'}
                        </p>
                        {profile?.role === 'admin' && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email} • {profile?.role || 'user'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200 relative",
                location.pathname === "/chat" || location.pathname.startsWith('/chat/')
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <MessageCircle className="h-5 w-5" />
              <span>Conversas</span>
              {unreadCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-2 text-xs px-2 py-0.5",
                    location.pathname === "/chat" || location.pathname.startsWith('/chat/')
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-destructive text-destructive-foreground"
                  )}
                >
                  {unreadCount}
                </Badge>
              )}
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

            {/* ClickUp Integration */}
            <Link
              to="/clickup"
              className={cn(
                "flex items-center space-x-3 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200",
                location.pathname === "/clickup"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Settings className="h-5 w-5" />
              <span>ClickUp</span>
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