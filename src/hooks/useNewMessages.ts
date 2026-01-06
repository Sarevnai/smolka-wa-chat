import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";
import { useDepartment } from "@/contexts/DepartmentContext";
import { useUserDepartment } from "@/hooks/useUserDepartment";
import { Database } from "@/integrations/supabase/types";

type DepartmentType = Database['public']['Enums']['department_type'];

export function useNewMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const { activeDepartment, isAdmin } = useDepartment();
  const { department: userDepartment } = useUserDepartment();

  // Determine effective department for filtering
  const effectiveDepartment: DepartmentType | null = isAdmin ? activeDepartment : userDepartment;

  // Reset counter when user navigates to chat page
  useEffect(() => {
    if (location.pathname === "/chat" || location.pathname.startsWith("/chat/")) {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  useEffect(() => {
    // Load initial unread count (messages from today, filtered by department)
    const loadUnreadCount = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Build query - need to join with conversations to filter by department
        let query = supabase
          .from("messages")
          .select("*, conversations!inner(department_code)", { count: "exact", head: true })
          .eq("direction", "inbound")
          .gte("wa_timestamp", today.toISOString());

        // Apply department filter
        if (effectiveDepartment) {
          // Filter by department OR null (pending triage)
          query = query.or(`department_code.eq.${effectiveDepartment},department_code.is.null`, { referencedTable: 'conversations' });
        }
        // If no effectiveDepartment (admin without selection), show all

        const { count, error } = await query;

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
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only count inbound messages and if not on chat page
          if (
            newMessage.direction === "inbound" && 
            !(location.pathname === "/chat" || location.pathname.startsWith("/chat/"))
          ) {
            // Check if message belongs to current department
            if (effectiveDepartment && newMessage.conversation_id) {
              const { data: conv } = await supabase
                .from("conversations")
                .select("department_code")
                .eq("id", newMessage.conversation_id)
                .single();
              
              // Only increment if department matches or is null (pending)
              if (conv?.department_code === effectiveDepartment || conv?.department_code === null) {
                setUnreadCount(prev => prev + 1);
              }
            } else if (!effectiveDepartment) {
              // No department filter (admin without selection), count all
              setUnreadCount(prev => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location.pathname, effectiveDepartment]);

  return { unreadCount };
}
