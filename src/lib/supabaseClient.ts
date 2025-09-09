import { createClient } from "@supabase/supabase-js";

const url = "https://wpjxsgxxhogzkkuznyke.supabase.co";
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwanhzZ3h4aG9nemtrdXpueWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDk3NjcsImV4cCI6MjA3MzAyNTc2N30.tTbVFi-CkgJZroJa-V0QPAPU5sYU3asmD-2yn2ytca0";

export const supabase = createClient(url, anon, {
  auth: { persistSession: false },
  global: { headers: { "x-application-name": "smolka-whatsapp-inbox" } },
});

// Supabase project URL for edge functions
export const SUPABASE_PROJECT_URL = url;