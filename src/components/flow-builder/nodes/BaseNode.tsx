import { memo, ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { LucideIcon, Check } from 'lucide-react';

interface BaseNodeProps {
  label: string;
  description?: string;
  icon: LucideIcon;
  color: string;
  borderColor: string;
  selected?: boolean;
  children?: ReactNode;
  showSourceHandle?: boolean;
  showTargetHandle?: boolean;
  sourceHandleCount?: number;
  isTestActive?: boolean;
  wasTestVisited?: boolean;
}

function BaseNodeComponent({
  label,
  description,
  icon: Icon,
  color,
  borderColor,
  selected,
  children,
  showSourceHandle = true,
  showTargetHandle = true,
  sourceHandleCount = 1,
  isTestActive = false,
  wasTestVisited = false,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        "min-w-[180px] rounded-xl shadow-lg relative",
        "bg-card border-2",
        "transition-[border-color,box-shadow,ring-color,opacity] duration-200",
        selected && "ring-2 ring-primary ring-offset-2",
        isTestActive && "ring-4 ring-green-500 node-test-pulse",
        wasTestVisited && !isTestActive && "opacity-75"
      )}
      style={{ borderColor: isTestActive ? '#22c55e' : borderColor }}
    >
      {/* Visited checkmark */}
      {wasTestVisited && !isTestActive && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center z-10">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Target Handle (entrada) */}
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ backgroundColor: color }}
      >
        <Icon className="h-4 w-4 text-white" />
        <span className="font-medium text-white text-sm">{label}</span>
      </div>

      {/* Content */}
      <div className="p-3 text-sm">
        {description && (
          <p className="text-muted-foreground text-xs mb-2">{description}</p>
        )}
        {children}
      </div>

      {/* Source Handle(s) (saída) */}
      {showSourceHandle && sourceHandleCount === 1 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
        />
      )}

      {/* Multiple source handles for condition nodes */}
      {showSourceHandle && sourceHandleCount > 1 && (
        <div className="flex justify-around px-2 pb-2">
          {Array.from({ length: sourceHandleCount }).map((_, index) => (
            <Handle
              key={index}
              type="source"
              position={Position.Bottom}
              id={`source-${index}`}
              className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background !relative !transform-none !left-auto !top-auto"
              style={{ position: 'relative' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const BaseNode = memo(BaseNodeComponent);
