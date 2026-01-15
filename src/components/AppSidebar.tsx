import { Link, useLocation } from "react-router-dom";
import { 
  Shield,
  LayoutDashboard,
  UserCog,
  Bot,
  TrendingUp,
  Puzzle,
  Settings,
  ChevronRight,
  Briefcase,
  Users,
  BarChart3,
  Bell,
  Sparkles
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

const integrationItems: { title: string; url: string; icon: typeof Settings }[] = [];

const aiItems = [
  { title: "Dashboard IA", url: "/admin/ia-dashboard", icon: LayoutDashboard },
  { title: "Leads", url: "/admin/leads", icon: Users },
  { title: "Configuração", url: "/admin/ia-configuracao", icon: Settings },
  { title: "Relatórios", url: "/admin/leads-relatorios", icon: BarChart3 },
  { title: "Notificações", url: "/admin/ia-notificacoes", icon: Bell },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { unreadCount } = useNewMessages();
  const permissions = usePermissions();
  const { count: triageCount } = useTriageConversations();
  const { isAdmin, userDepartment, activeDepartment, loading } = useDepartment();
  const [adminOpen, setAdminOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  
  // Determine which department to show - only apply fallback after loading completes
  const effectiveDepartment = loading 
    ? null 
    : (isAdmin 
      ? (activeDepartment || 'locacao') 
      : (userDepartment || 'locacao'));
  
  const config = effectiveDepartment ? getDepartmentConfig(effectiveDepartment) : null;

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    if (path === "/marketing") return currentPath === "/marketing" && !currentPath.includes("/marketing/");
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path: string) => {
    const active = isActive(path);
    return cn(
      "w-full justify-start transition-all duration-200",
      active && config
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
        {!collapsed && isAdmin && !loading && <DepartmentSelector />}
        
        {/* Loading skeleton while department loads */}
        {!collapsed && loading && (
          <div className="mx-3 my-3 rounded-lg overflow-hidden p-4 bg-neutral-100 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-neutral-200 rounded-md w-8 h-8" />
              <div className="flex flex-col gap-1">
                <div className="h-2 w-8 bg-neutral-200 rounded" />
                <div className="h-4 w-20 bg-neutral-200 rounded" />
              </div>
            </div>
          </div>
        )}
        
        {/* Department Header for non-admins - only show when loaded */}
        {!collapsed && !isAdmin && !loading && config && (
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
        {config && (
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
        )}

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

        {/* Minha IA Section - Admin Only */}
        {permissions.isAdmin && (
          <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md p-2 flex items-center justify-between text-violet-600">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    {!collapsed && <span>Minha IA</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={cn("h-4 w-4 transition-transform", aiOpen && "rotate-90")} />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {aiItems.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild className={getNavClassName(item.url)}>
                          <Link to={item.url}>
                            <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                            {!collapsed && <span>{item.title}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
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
                      <SidebarMenuButton asChild className={getNavClassName('/admin/gestao')}>
                        <Link to="/admin/gestao">
                          <Briefcase className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                          {!collapsed && <span>Gestão</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
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
