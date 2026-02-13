// ========== STRUCTURED ERROR LOGGING ==========
// Shared error logging for all AI agents (Phase C.1)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface AIErrorLogEntry {
  agent_name: string;
  error_type: string;
  error_message: string;
  context?: Record<string, any>;
  phone_number?: string;
  conversation_id?: string;
  department_code?: string;
}

/**
 * Log a structured AI error to the ai_error_log table.
 * Non-blocking: catches its own errors to avoid disrupting the caller.
 */
export async function logAIError(
  supabase: any,
  entry: AIErrorLogEntry
): Promise<void> {
  try {
    await supabase.from('ai_error_log').insert({
      agent_name: entry.agent_name,
      error_type: entry.error_type,
      error_message: entry.error_message.substring(0, 2000), // Limit size
      context: entry.context || {},
      phone_number: entry.phone_number || null,
      conversation_id: entry.conversation_id || null,
      department_code: entry.department_code || null,
    });
  } catch (err) {
    // Non-blocking: just log to console
    console.error('⚠️ Failed to log AI error:', err);
  }
}

/**
 * Wrap an async operation with automatic error logging.
 * Returns the result or null if the operation fails.
 */
export async function withErrorLogging<T>(
  supabase: any,
  agentName: string,
  operation: () => Promise<T>,
  meta?: Partial<AIErrorLogEntry>
): Promise<T | null> {
  try {
    return await operation();
  } catch (error: any) {
    await logAIError(supabase, {
      agent_name: agentName,
      error_type: 'unhandled_exception',
      error_message: error?.message || String(error),
      ...meta,
    });
    return null;
  }
}
