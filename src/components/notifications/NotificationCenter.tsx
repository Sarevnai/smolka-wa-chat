import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { 
  Bell, 
  BellOff, 
  MessageCircle, 
  Users, 
  Send, 
  Settings,
  Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'message':
      return MessageCircle;
    case 'contact':
      return Users;
    case 'campaign':
      return Send;
    case 'integration':
      return Settings;
    default:
      return Bell;
  }
};

export function NotificationCenter() {
  const { 
    notifications, 
    isEnabled, 
    clearNotifications, 
    toggleNotifications 
  } = useRealtimeNotifications();

  const unreadCount = notifications.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          {isEnabled ? (
            <Bell className="h-4 w-4" />
          ) : (
            <BellOff className="h-4 w-4" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNotifications}
              className="h-6 w-6 p-0"
            >
              {isEnabled ? (
                <Bell className="h-3 w-3" />
              ) : (
                <BellOff className="h-3 w-3" />
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-1">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <DropdownMenuItem key={notification.id} className="flex flex-col items-start p-3 focus:bg-accent/50">
                    <div className="flex w-full items-start gap-3">
                      <div className={cn(
                        "p-1.5 rounded-lg mt-1",
                        notification.type === 'message' && "bg-blue-100 dark:bg-blue-900/20",
                        notification.type === 'contact' && "bg-green-100 dark:bg-green-900/20",
                        notification.type === 'campaign' && "bg-purple-100 dark:bg-purple-900/20",
                        notification.type === 'integration' && "bg-orange-100 dark:bg-orange-900/20"
                      )}>
                        <Icon className={cn(
                          "h-3 w-3",
                          notification.type === 'message' && "text-blue-600 dark:text-blue-400",
                          notification.type === 'contact' && "text-green-600 dark:text-green-400",
                          notification.type === 'campaign' && "text-purple-600 dark:text-purple-400",
                          notification.type === 'integration' && "text-orange-600 dark:text-orange-400"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.timestamp), { 
                            addSuffix: true,
                            locale: ptBR 
                          })}
                        </p>
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}