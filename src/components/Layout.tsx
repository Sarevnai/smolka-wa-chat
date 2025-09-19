import { useLocation } from "react-router-dom";
import { LogOut, User, Crown, Settings, Puzzle, Keyboard } from "lucide-react";
import monogramaLogo from "@/assets/monograma-logo.png";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import AICommunicatorWidget from "@/components/ai/AICommunicatorWidget";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BreadcrumbNav } from "@/components/navigation/BreadcrumbNav";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
export default function Layout({
  children
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const {
    user,
    profile,
    signOut
  } = useAuth();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();
  const handleSignOut = async () => {
    await signOut();
  };
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b bg-card sticky top-0 z-40">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center space-x-3">
                <SidebarTrigger />
                <div className="flex items-center space-x-2">
                  <img src={monogramaLogo} alt="Smolka Logo" className="h-6 w-6" />
                  <h1 className="text-lg font-bold text-foreground hidden sm:block">
                    ADM Locação - Central de atendimento
                  </h1>
                </div>
              </div>
              
              {/* Live indicator, Theme Toggle, Notifications and User Menu */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 rounded-full bg-live-indicator animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Live</span>
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                {user && <NotificationCenter />}

                {/* Settings Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Configurações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <a href="/integrations">
                        <Puzzle className="mr-2 h-4 w-4" />
                        Integrações
                      </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      // Trigger keyboard shortcuts help
                      const event = new KeyboardEvent('keydown', { key: '/' });
                      window.dispatchEvent(event);
                    }}>
                      <Keyboard className="mr-2 h-4 w-4" />
                      Atalhos de Teclado
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
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
                          {profile?.role === 'admin' && <Crown className="h-3 w-3 text-yellow-500" />}
                        </div>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user?.email} • {profile?.role || 'user'}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <a href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                      </a>
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
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {/* Breadcrumbs */}
              <BreadcrumbNav />
              
              {/* Page Content */}
              {children}
            </div>
          </main>
          
          {/* AI Communicator Widget - Available except on individual chat pages */}
          {!location.pathname.startsWith('/chat/') && <AICommunicatorWidget />}
        </div>
      </div>
    </SidebarProvider>
  );
}