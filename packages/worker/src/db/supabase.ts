import { createClient } from "@supabase/supabase-js";
// Node.js < 22 has no native WebSocket — pass the ws package explicitly
// so @supabase/realtime-js can open Realtime connections.
import ws from "ws";

export const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
    realtime: { transport: ws as unknown as typeof WebSocket },
  }
);
