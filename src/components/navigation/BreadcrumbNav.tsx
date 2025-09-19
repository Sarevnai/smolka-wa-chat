import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  Home,
  MessageCircle,
  Send,
  Users,
  BarChart3,
  Settings,
  User,
  Puzzle
} from "lucide-react";

const routeConfig = {
  '/': { 
    label: 'Dashboard', 
    icon: Home 
  },
  '/inbox': { 
    label: 'Inbox', 
    icon: MessageCircle 
  },
  '/chat': { 
    label: 'Conversas', 
    icon: MessageCircle 
  },
  '/send': { 
    label: 'Campanhas', 
    icon: Send 
  },
  '/contacts': { 
    label: 'Contatos', 
    icon: Users 
  },
  '/reports': { 
    label: 'Relatórios', 
    icon: BarChart3 
  },
  '/profile': { 
    label: 'Perfil', 
    icon: User 
  },
  '/clickup': { 
    label: 'ClickUp', 
    icon: Settings 
  },
  '/integrations': { 
    label: 'Integrações', 
    icon: Puzzle 
  }
};

export function BreadcrumbNav() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on homepage
  if (location.pathname === '/') {
    return null;
  }

  const generateBreadcrumbs = () => {
    const breadcrumbs = [
      {
        label: 'Dashboard',
        path: '/',
        icon: Home
      }
    ];

    let currentPath = '';
    pathnames.forEach((pathname, index) => {
      currentPath += `/${pathname}`;
      
      // Handle chat with phone number
      if (pathname === 'chat' && pathnames[index + 1]) {
        breadcrumbs.push({
          label: 'Conversas',
          path: '/chat',
          icon: MessageCircle
        });
        // Add phone number as final breadcrumb
        breadcrumbs.push({
          label: `Conversa: ${decodeURIComponent(pathnames[index + 1])}`,
          path: currentPath + `/${pathnames[index + 1]}`,
          icon: MessageCircle
        });
        return; // Skip the phone number in next iteration
      }

      // Skip if this is a phone number (comes after chat)
      if (pathnames[index - 1] === 'chat' && !isNaN(Number(pathname.replace(/\D/g, '')))) {
        return;
      }

      const config = routeConfig[currentPath as keyof typeof routeConfig];
      if (config) {
        breadcrumbs.push({
          label: config.label,
          path: currentPath,
          icon: config.icon
        });
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const Icon = breadcrumb.icon;

          return (
            <div key={breadcrumb.path} className="flex items-center">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {breadcrumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={breadcrumb.path} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Icon className="h-4 w-4" />
                      {breadcrumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}