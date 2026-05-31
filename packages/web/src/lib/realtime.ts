import { sb } from "./supabase";
import type { Verdict, Investigation } from "./types";

export function subscribeToVerdicts(onInsert: (verdict: Verdict) => void) {
  const channel = sb
    .channel("verdicts-stream")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "verdicts" },
      (payload) => onInsert(payload.new as Verdict)
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}

export function subscribeToInvestigations(onUpdate: (inv: Investigation) => void) {
  const channel = sb
    .channel("investigations-stream")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "investigations" },
      (payload) => onUpdate(payload.new as Investigation)
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
