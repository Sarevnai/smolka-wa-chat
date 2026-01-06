import { Link, useLocation } from "react-router-dom";
import { 
  Shield,
  LayoutDashboard,
  UserCog,
  Bot,
  TrendingUp,
  Puzzle,
  Settings,
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
import { usePermissions } from "@/hooks/usePermissions";
import { useTriageConversations } from "@/hooks/useTriageConversations";
import { useDepartment } from "@/contexts/DepartmentContext";
import { DepartmentSelector } from "@/components/department/DepartmentSelector";
import { getDepartmentConfig, DEPARTMENT_SIDEBAR_CONFIG } from "@/lib/sidebarConfig";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const integrationItems = [
  { title: "ClickUp", url: "/clickup", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { unreadCount } = useNewMessages();
  const permissions = usePermissions();
  const { count: triageCount } = useTriageConversations();
  const { isAdmin, userDepartment, activeDepartment } = useDepartment();
  const [adminOpen, setAdminOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  
  // Determine which department to show
  const effectiveDepartment = isAdmin 
    ? (activeDepartment || 'locacao') 
    : (userDepartment || 'locacao');
  
  const config = getDepartmentConfig(effectiveDepartment);

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    if (path === "/marketing") return currentPath === "/marketing" && !currentPath.includes("/marketing/");
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return cn(
      "w-full justify-start transition-all duration-200",
      active
        ? cn("border-l-3 font-semibold", config.bgLight, config.textColor, config.borderColor)
        : "hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900"
    );
  };

  const getBadgeCount = (badgeType?: 'unread' | 'triage') => {
    if (badgeType === 'unread') return unreadCount;
    if (badgeType === 'triage') return triageCount;
    return 0;
  };

  return (
    <Sidebar collapsible="icon" className={cn(
      "transition-all duration-300 bg-surface-sidebar border-r border-neutral-200",
      collapsed ? "w-14" : "w-64"
    )}>
      <SidebarContent>
        {/* Department Selector for Admins */}
        {!collapsed && isAdmin && <DepartmentSelector />}
        
        {/* Department Header for non-admins */}
        {!collapsed && !isAdmin && (
          <div className={cn(
            "mx-3 my-3 rounded-lg overflow-hidden p-4",
            "bg-gradient-to-r",
            config.gradient
          )}>
            <div className="flex items-center gap-3 text-white">
              <div className="p-1.5 bg-white/20 rounded-md">
                <config.icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider opacity-80">Setor</span>
                <span className="font-semibold">{config.label}</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Department Items */}
      <SidebarGroup className="mt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              {config.items.map((item) => {
                const badgeCount = getBadgeCount(item.badge);
                const showBadge = badgeCount > 0;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={getNavClassName(item.url)}>
                      <Link to={item.url}>
                        <item.icon className={cn(
                          "h-5 w-5", 
                          collapsed ? "mx-auto" : "mr-3",
                          item.badge === 'triage' && badgeCount > 0 ? "text-amber-500" : ""
                        )} />
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span>{item.title}</span>
                            {showBadge && (
                              <Badge 
                                variant={item.badge === 'triage' ? "destructive" : "destructive"} 
                                className="text-xs"
                              >
                                {badgeCount}
                              </Badge>
                            )}
                          </div>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Integrations Section - Admin Only */}
        {permissions.isAdmin && (
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
        )}

        {/* Administrative Section - Admin Only */}
        {permissions.isAdmin && (
          <Collapsible open={adminOpen} onOpenChange={setAdminOpen}>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md p-2 flex items-center justify-between text-primary">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {!collapsed && <span>Administração</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={cn("h-4 w-4 transition-transform", adminOpen && "rotate-90")} />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={getNavClassName('/admin')}>
                        <Link to="/admin">
                          <LayoutDashboard className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                          {!collapsed && <span>Dashboard Admin</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={getNavClassName('/admin/users')}>
                        <Link to="/admin/users">
                          <UserCog className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                          {!collapsed && <span>Gestão de Usuários</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={getNavClassName('/admin/user-permissions')}>
                        <Link to="/admin/user-permissions">
                          <Shield className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                          {!collapsed && <span>Permissões por Usuário</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={getNavClassName('/admin/ai-agent')}>
                        <Link to="/admin/ai-agent">
                          <Bot className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                          {!collapsed && <span>Agente IA</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild className={getNavClassName('/admin/c2s-dashboard')}>
                        <Link to="/admin/c2s-dashboard">
                          <TrendingUp className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                          {!collapsed && <span>Dashboard C2S</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
