import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  Inbox, 
  MessageCircle, 
  Send, 
  Users, 
  BarChart3, 
  Settings,
  Puzzle,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useNewMessages } from "@/hooks/useNewMessages";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Inbox", url: "/inbox", icon: Inbox, badge: "New" },
  { title: "Conversas", url: "/chat", icon: MessageCircle, hasUnreadCount: true },
  { title: "Campanhas", url: "/send", icon: Send },
  { title: "Contatos", url: "/contacts", icon: Users },
  { title: "Relatórios", url: "/reports", icon: BarChart3 },
];

const integrationItems = [
  { title: "ClickUp", url: "/clickup", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { unreadCount } = useNewMessages();
  const [integrationsOpen, setIntegrationsOpen] = useState(true);

  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    return cn(
      "w-full justify-start transition-all duration-200",
      isActive(path)
        ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
        : "hover:bg-accent hover:text-accent-foreground"
    );
  };

  return (
    <Sidebar collapsible="icon" className={cn("transition-all duration-300", collapsed ? "w-14" : "w-64")}>
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navegação Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={getNavClassName(item.url)}>
                    <Link to={item.url}>
                      <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>{item.title}</span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                          {item.hasUnreadCount && unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {unreadCount}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrations Section */}
        <Collapsible open={integrationsOpen} onOpenChange={setIntegrationsOpen}>
          <SidebarGroup>
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md p-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4" />
                  {!collapsed && <span>Integrações</span>}
                </div>
                {!collapsed && (
                  <ChevronRight className={cn("h-4 w-4 transition-transform", integrationsOpen && "rotate-90")} />
                )}
              </SidebarGroupLabel>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className={getNavClassName("/integrations")}>
                      <Link to="/integrations">
                        <Puzzle className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                        {!collapsed && <span>Todas as Integrações</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuSub>
                    {integrationItems.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton asChild className={getNavClassName(item.url)}>
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4 mr-2" />
                            {!collapsed && <span>{item.title}</span>}
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  );
}