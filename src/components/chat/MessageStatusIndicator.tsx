import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatusIndicatorProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
}

export function MessageStatusIndicator({ status, className }: MessageStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="h-3 w-3 text-white/60 animate-pulse" />;
      case 'sent':
        return <Check className="h-3 w-3 text-white/70" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-white/80" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn("inline-flex items-center", className)}>
      {getStatusIcon()}
    </div>
  );
}