import { 
  Play, 
  MessageCircle, 
  GitBranch, 
  Zap, 
  UserPlus, 
  Webhook, 
  Clock, 
  Square,
  GripVertical
} from 'lucide-react';
import { NODE_PALETTE_ITEMS, FlowNodeType } from '@/types/flow';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ElementType> = {
  Play,
  MessageCircle,
  GitBranch,
  Zap,
  UserPlus,
  Webhook,
  Clock,
  Square
};

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: FlowNodeType) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="w-64 border-r bg-card p-4 flex flex-col gap-2 overflow-y-auto">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
        Blocos
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        Arraste os blocos para o canvas
      </p>
      
      <div className="space-y-2">
        {NODE_PALETTE_ITEMS.map((item) => {
          const Icon = iconMap[item.icon];
          
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(e) => onDragStart(e, item.type)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border cursor-grab",
                "bg-background hover:bg-accent/50 transition-colors",
                "active:cursor-grabbing active:scale-95 transition-transform"
              )}
            >
              <div className={cn("p-2 rounded-md", item.color)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.description}
                </p>
              </div>
              <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
