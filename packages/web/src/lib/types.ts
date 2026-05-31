export type CauseLabel = "flag" | "deploy" | "both" | "neither" | "inconclusive";

export interface Investigation {
  id: string;
  trigger_type: "flag_flip" | "deploy" | "metric_spike" | "manual";
  identifier: string;
  occurred_at: string;
  enqueued_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: "pending" | "running" | "complete" | "failed";
  error_message: string | null;
}

export interface Verdict {
  id: string;
  investigation_id: string;
  cause_label: CauseLabel;
  cause_confidence: number;
  cause_reasoning: string;
  error_delta_pct: number | null;
  latency_delta_ms: number | null;
  users_affected: number | null;
  cohorts: { dimension: string; pct_of_impact: number }[];
  sources_used: string[];
  actions: { label: string; type: string; payload: Record<string, unknown> }[];
  created_at: string;
}

export interface QueryRun {
  id: string;
  investigation_id: string;
  purpose: string;
  sql: string;
  row_count: number;
  result_storage_key: string | null;
  executed_at: string;
}

export interface Source {
  name: string;
  display_name: string;
  status: "healthy" | "degraded" | "error" | "disconnected";
  last_checked_at: string | null;
  last_error: string | null;
}

export interface InvestigationWithVerdict extends Investigation {
  verdicts: Verdict[];
  // Supabase aggregate: .select("*, verdicts(*), query_runs(count)")
  query_runs?: { count: number }[];
}

// Badge & cause styling helpers (no emoji — use CAUSE_ICONS for icons)
export const CAUSE_CONFIG: Record<CauseLabel, { label: string; colorClass: string; bgClass: string }> = {
  flag:         { label: "Flag",         colorClass: "text-flag",         bgClass: "bg-flag-bg" },
  deploy:       { label: "Deploy",       colorClass: "text-deploy",       bgClass: "bg-deploy-bg" },
  both:         { label: "Both",         colorClass: "text-both",         bgClass: "bg-both-bg" },
  neither:      { label: "Neither",      colorClass: "text-neither",      bgClass: "bg-neither-bg" },
  inconclusive: { label: "Inconclusive", colorClass: "text-inconclusive", bgClass: "bg-inconclusive-bg" },
};
