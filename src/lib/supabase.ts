import { createClient } from "@supabase/supabase-js";

// Read from Vite env vars (must be prefixed with VITE_ to be exposed to the client).
// Falls back to project values so local/preview builds keep working without .env.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://qsfojjxolayvpwwiydhp.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzZm9qanhvbGF5dnB3d2l5ZGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzU1MDYsImV4cCI6MjA5MjAxMTUwNn0.Y1E673Rkek_J0BAk53vtj6QoXQImVfsJMf2zC1NwnTM";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY env vars");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

export const MENU_IMAGES_BUCKET = "menu-images";
