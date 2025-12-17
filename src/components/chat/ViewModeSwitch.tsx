import { Target, ClipboardList } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDepartment } from "@/contexts/DepartmentContext";
import { cn } from "@/lib/utils";

export function ViewModeSwitch() {
  const { viewMode, setViewMode, isAdmin } = useDepartment();

  // Only show for admins
  if (!isAdmin) return null;

  return (
    <TooltipProvider>
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(value) => value && setViewMode(value as 'leads' | 'tasks')}
        className="bg-white/10 rounded-md p-0.5"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="leads" 
              aria-label="Modo Leads"
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-white data-[state=on]:text-primary",
                "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <Target className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Leads</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Modo CRM - Pipeline de leads</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="tasks" 
              aria-label="Modo Tarefas"
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 data-[state=on]:bg-white data-[state=on]:text-primary",
                "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tarefas</span>
            </ToggleGroupItem>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Modo Demandas - Tickets e tarefas</p>
          </TooltipContent>
        </Tooltip>
      </ToggleGroup>
    </TooltipProvider>
  );
}
