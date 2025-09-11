import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLocation } from "react-router-dom";

export function useNewMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();

  // Reset counter when user navigates to chat page
  useEffect(() => {
    if (location.pathname === "/chat" || location.pathname.startsWith("/chat/")) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Load initial unread count (messages from today)
    const loadUnreadCount = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("direction", "inbound")
          .gte("wa_timestamp", today.toISOString());

        if (error) throw error;
        
        // Only show count if not on chat page
        if (!(location.pathname === "/chat" || location.pathname.startsWith("/chat/"))) {
          setUnreadCount(count || 0);
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    loadUnreadCount();

    // Setup realtime subscription for new messages
    const channel = supabase
      .channel("new-messages-counter")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages"
        },
        (payload) => {
          const newMessage = payload.new as any;
          
          // Only count inbound messages and if not on chat page
          if (
            newMessage.direction === "inbound" && 
            !(location.pathname === "/chat" || location.pathname.startsWith("/chat/"))
          ) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location.pathname]);

  return { unreadCount };
}