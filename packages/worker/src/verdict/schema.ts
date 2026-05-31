import { z } from "zod";

export const VerdictSchema = z.object({
  trigger: z.object({
    type: z.enum(["flag_flip", "deploy", "metric_spike", "manual"]),
    identifier: z.string(),            // e.g. "checkout-v2" or "api-gateway@v2.4.1"
    occurred_at: z.string().datetime(),
  }),
  cause: z.object({
    label: z.enum(["flag", "deploy", "both", "neither", "inconclusive"]),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),             // 1-3 sentences in plain English
  }),
  impact: z.object({
    error_delta_pct: z.number().nullable(),
    latency_delta_ms: z.number().nullable(),
    users_affected: z.number().int().nonnegative().nullable(),
    cohorts: z.array(z.object({
      dimension: z.string(),           // e.g. "browser=Safari, country=DE"
      pct_of_impact: z.number().min(0).max(100),
    })).max(10),
  }),
  evidence: z.object({
    queries: z.array(z.object({
      purpose: z.string(),
      sql: z.string(),
      row_count: z.number().int().nonnegative(),
    })),
    sources_used: z.array(z.string()),
  }),
  actions: z.array(z.object({
    label: z.string(),
    type: z.enum(["rollback", "ticket", "alert", "investigate"]),
    payload: z.record(z.string(), z.unknown()),
  })),
});

export type Verdict = z.infer<typeof VerdictSchema>;
