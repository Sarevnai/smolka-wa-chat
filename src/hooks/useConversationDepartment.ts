import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type DepartmentType = Database['public']['Enums']['department_type'];

/**
 * Utility function to get the department of a conversation
 */
export async function getConversationDepartment(
  conversationId: string | null
): Promise<DepartmentType | null> {
  if (!conversationId) return null;
  
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('department_code')
      .eq('id', conversationId)
      .single();
    
    if (error) {
      console.error('Error fetching conversation department:', error);
      return null;
    }
    
    return data?.department_code || null;
  } catch (error) {
    console.error('Error fetching conversation department:', error);
    return null;
  }
}

/**
 * Cache for conversation department lookups to avoid repeated queries
 */
const departmentCache = new Map<string, { department: DepartmentType | null; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getConversationDepartmentCached(
  conversationId: string | null
): Promise<DepartmentType | null> {
  if (!conversationId) return null;
  
  const cached = departmentCache.get(conversationId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.department;
  }
  
  const department = await getConversationDepartment(conversationId);
  departmentCache.set(conversationId, { department, timestamp: Date.now() });
  
  return department;
}

export function clearDepartmentCache() {
  departmentCache.clear();
}
