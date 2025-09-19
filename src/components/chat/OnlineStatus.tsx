import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OnlineStatusProps {
  phoneNumber: string;
  className?: string;
}

export function OnlineStatus({ phoneNumber, className }: OnlineStatusProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Simulate online status (in production, this would come from real data)
  useEffect(() => {
    const checkOnlineStatus = () => {
      // Random online status for demo (replace with real logic)
      const online = Math.random() > 0.7;
      setIsOnline(online);
      
      if (!online && Math.random() > 0.5) {
        // Set a random last seen time
        const minutesAgo = Math.floor(Math.random() * 120) + 1;
        setLastSeen(new Date(Date.now() - minutesAgo * 60 * 1000));
      }
    };

    checkOnlineStatus();
    const interval = setInterval(checkOnlineStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [phoneNumber]);

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "agora há pouco";
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days === 1) return "ontem";
    if (days < 7) return `${days} dias atrás`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-green-500" : "bg-gray-400"
      )} />
      <span className="text-sm text-muted-foreground">
        {isOnline ? "online" : lastSeen ? `visto por último ${formatLastSeen(lastSeen)}` : "offline"}
      </span>
    </div>
  );
}