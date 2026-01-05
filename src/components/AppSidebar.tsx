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
  ChevronRight,
  Shield,
  LayoutDashboard,
  UserCog,
  Bot,
  AlertTriangle,
  ShoppingBag,
  Building2,
  Kanban,
  TrendingUp,
  Megaphone
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home, permission: 'canViewDashboard' as const, adminOnly: false },
  { title: "Conversas", url: "/chat", icon: MessageCircle, hasUnreadCount: true, permission: 'canViewChats' as const, adminOnly: false },
  { title: "Campanhas", url: "/send", icon: Send, permission: 'canViewCampaigns' as const, adminOnly: true },
  { title: "Contatos", url: "/contacts", icon: Users, permission: 'canViewContacts' as const, adminOnly: false },
  { title: "Relatórios", url: "/reports", icon: BarChart3, permission: 'canViewReports' as const, adminOnly: true },
];

const pipelineItems = [
  { title: "Locação", url: "/pipeline/locacao", icon: Home, department: 'locacao' as const },
  { title: "Vendas", url: "/pipeline/vendas", icon: ShoppingBag, department: 'vendas' as const },
  { title: "Administrativo", url: "/pipeline/administrativo", icon: Building2, department: 'administrativo' as const },
  { title: "Marketing", url: "/pipeline/marketing", icon: Megaphone, department: 'marketing' as const },
];

const integrationItems = [
  { title: "ClickUp", url: "/clickup", icon: Settings, permission: 'canManageIntegrations' as const },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { unreadCount } = useNewMessages();
  const permissions = usePermissions();
  const { count: triageCount } = useTriageConversations();
  const { isAdmin, userDepartment, activeDepartment } = useDepartment();
  const [integrationsOpen, setIntegrationsOpen] = useState(true);
  const [pipelinesOpen, setPipelinesOpen] = useState(true);

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
        ? "bg-gold-primary/12 border-l-3 border-gold-primary text-gold-primary font-semibold hover:bg-gold-primary/20"
        : "hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900"
    );
  };

  // Filter pipelines based on user access
  const accessiblePipelines = pipelineItems.filter(item => 
    isAdmin || userDepartment === item.department
  );

  return (
    <Sidebar collapsible="icon" className={cn(
      "transition-all duration-300 bg-surface-sidebar border-r border-neutral-200",
      collapsed ? "w-14" : "w-64"
    )}>
      <SidebarContent>
        {/* Department Selector for Admins */}
        {!collapsed && <DepartmentSelector />}

        {/* Triagem - Only for Admins */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={getNavClassName('/triage')}>
                    <Link to="/triage">
                      <AlertTriangle className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3", 
                        triageCount > 0 ? "text-amber-500" : ""
                      )} />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1">
                          <span>Triagem</span>
                          {triageCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {triageCount}
                            </Badge>
                          )}
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Pipelines Section */}
        {accessiblePipelines.length > 0 && (
          <Collapsible open={pipelinesOpen} onOpenChange={setPipelinesOpen}>
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-accent/50 rounded-md p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Kanban className="h-4 w-4" />
                    {!collapsed && <span>Pipelines</span>}
                  </div>
                  {!collapsed && (
                    <ChevronRight className={cn("h-4 w-4 transition-transform", pipelinesOpen && "rotate-90")} />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {accessiblePipelines.map((item) => (
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

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Geral</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems
                .filter(item => (!item.permission || permissions[item.permission]) && (!item.adminOnly || permissions.isAdmin))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className={getNavClassName(item.url)}>
                      <Link to={item.url}>
                        <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                        {!collapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span>{item.title}</span>
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
                      {integrationItems
                        .filter(item => !item.permission || permissions[item.permission])
                        .map((item) => (
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

        {/* Seção Administrativa - Apenas para Admins */}
        {permissions.isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 text-primary">
              <Shield className="h-4 w-4" />
              {!collapsed && <span>Administração</span>}
            </SidebarGroupLabel>
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
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={getNavClassName('/admin/marketing')}>
                    <Link to="/admin/marketing">
                      <Megaphone className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                      {!collapsed && <span>Dashboard Marketing</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
