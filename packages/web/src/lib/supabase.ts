import { createClient } from "@supabase/supabase-js";

export const sb = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
