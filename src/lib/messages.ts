import { supabase } from "./supabaseClient";

export type MessageRow = {
  id: number;
  wa_message_id: string | null;
  wa_from: string | null;
  wa_to: string | null;
  wa_phone_number_id: string | null;
  direction: "inbound" | "outbound";
  body: string | null;
  wa_timestamp: string | null; // ISO
  raw: any;
  created_at: string | null;
};

export type Period = "today" | "7d" | "30d" | "all";

function periodToRange(period: Period): { from?: string } {
  const now = new Date();
  if (period === "today") {
    const start = new Date();
    start.setHours(0,0,0,0);
    return { from: start.toISOString() };
  }
  if (period === "7d") {
    const start = new Date(now.getTime() - 7*24*60*60*1000);
    return { from: start.toISOString() };
  }
  if (period === "30d") {
    const start = new Date(now.getTime() - 30*24*60*60*1000);
    return { from: start.toISOString() };
  }
  return {};
}

export async function fetchMessages(params: { q?: string; period: Period; limit?: number }) {
  const { q, period, limit = 100 } = params;
  let query = supabase
    .from("messages")
    .select("*")
    .order("wa_timestamp", { ascending: false })
    .limit(limit);

  const range = periodToRange(period);
  if (range.from) {
    query = query.gte("wa_timestamp", range.from);
  }

  if (q && q.trim()) {
    // Busca simples por número em wa_from
    query = query.ilike("wa_from", `%${q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}