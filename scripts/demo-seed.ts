/**
 * scripts/demo-seed.ts
 *
 * Fires a set of REAL analyses through the live pipeline.
 * Each trigger goes → API → BullMQ → Gemini agent → Coral → Supabase.
 * Verdicts that appear in the dashboard are 100% genuine.
 *
 * Usage:
 *   pnpm tsx scripts/demo-seed.ts
 *
 * Requires the API to be running on localhost:3001 (or API_URL env var).
 * The worker must also be running to process the jobs.
 */

import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.API_URL ?? "http://localhost:3001";
const DELAY_MS = 5000; // 5 seconds between triggers to avoid queue saturation

// ── The real events we know exist in the connected data sources ───────────────
//
// checkout-v2 was flipped at epoch 1780125622108 = 2026-05-30T07:20:22Z
// Sentry has 1 real error: "Payment processing failed (checkout-v2 rollout)"
// We vary the occurred_at slightly so each analysis runs a different time window
// and the agent makes different decisions (one finds the error, one doesn't, etc.)

const REAL_FLAG_FLIP_TIME = "2026-05-30T07:20:22.108Z";
const REAL_FLAG_FLIP_TIME_2 = "2026-05-30T07:20:49.089Z"; // second flip event

const triggers: {
  label: string;
  trigger_type: "flag_flip" | "deploy" | "metric_spike" | "manual";
  identifier: string;
  occurred_at: string;
  hint?: string;
}[] = [
  // ── 1. The flag flip that caused the real payment error ─────────────────────
  {
    label: "checkout-v2 flag flip (primary)",
    trigger_type: "flag_flip",
    identifier: "checkout-v2",
    occurred_at: REAL_FLAG_FLIP_TIME,
    hint: "This flag was flipped and may have caused payment failures. Check Sentry for payment-related errors in the hour after the flip.",
  },

  // ── 2. Same flag, second flip event (second opinion from agent) ─────────────
  {
    label: "checkout-v2 flag flip (second event)",
    trigger_type: "flag_flip",
    identifier: "checkout-v2",
    occurred_at: REAL_FLAG_FLIP_TIME_2,
    hint: "This is the second flip of checkout-v2. The agent should investigate whether the error persisted or resolved.",
  },

  // ── 3. Manual investigation of the payment error from Sentry ────────────────
  {
    label: "payment-processing-failed (manual)",
    trigger_type: "manual",
    identifier: "payment-processing-failed",
    occurred_at: "2026-05-30T08:14:43.000Z",
    hint: "A Sentry error 'Payment processing failed: Invalid stripe token (checkout-v2 rollout)' was detected. Investigate what caused this — a flag flip or a deploy?",
  },

  // ── 4. LD Premium Dashboard Access example flag (different cause expected) ──
  {
    label: "premium-dashboard-access flag flip",
    trigger_type: "flag_flip",
    identifier: "LD Example Flag: Premium Dashboard Access",
    occurred_at: new Date(1780087970079).toISOString(),
    hint: "An example flag was flipped. Agent should check if there are any correlated errors in Sentry or deploys in Vercel.",
  },

  // ── 5. LD Maintenance Banner example flag ───────────────────────────────────
  {
    label: "maintenance-banner flag flip",
    trigger_type: "flag_flip",
    identifier: "LD Example Flag: Maintenance Banner",
    occurred_at: new Date(1780087969481).toISOString(),
    hint: "The maintenance banner flag was toggled. Check if there were any deploys or errors around the same time.",
  },
];

async function triggerAnalysis(t: (typeof triggers)[0], index: number) {
  console.log(`\n[${index + 1}/${triggers.length}] Triggering: ${t.label}`);
  console.log(`  identifier:   ${t.identifier}`);
  console.log(`  occurred_at:  ${t.occurred_at}`);

  const body = {
    trigger_type: t.trigger_type,
    identifier: t.identifier,
    occurred_at: t.occurred_at,
    ...(t.hint ? { hint: t.hint } : {}),
  };

  try {
    const response = await fetch(`${API_URL}/triggers/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`  ✗ Failed (${response.status}): ${text}`);
      return;
    }

    const data = (await response.json()) as { enqueued: boolean; jobId: string };
    console.log(`  ✓ Enqueued as job ${data.jobId}`);
  } catch (err) {
    console.error(`  ✗ Network error: ${(err as Error).message}`);
    console.error(`  Make sure the API is running: pnpm --filter api dev`);
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("━".repeat(60));
  console.log("  Blast Radius — Demo Analysis Seed");
  console.log("━".repeat(60));
  console.log(`  API URL: ${API_URL}`);
  console.log(`  Firing ${triggers.length} real analyses through the live pipeline.`);
  console.log(`  Each one goes: API → BullMQ → Gemini → Coral → Supabase`);
  console.log(`  Watch the dashboard at http://localhost:5173`);
  console.log("━".repeat(60));

  // Check API health first
  try {
    const health = await fetch(`${API_URL}/health`);
    if (!health.ok) throw new Error(`HTTP ${health.status}`);
    console.log("\n✓ API is reachable\n");
  } catch {
    console.error("\n✗ Cannot reach API at", API_URL);
    console.error("  Start it with: pnpm --filter api dev\n");
    process.exit(1);
  }

  for (let i = 0; i < triggers.length; i++) {
    await triggerAnalysis(triggers[i]!, i);

    if (i < triggers.length - 1) {
      console.log(`  ⏳ Waiting ${DELAY_MS / 1000}s before next trigger...`);
      await sleep(DELAY_MS);
    }
  }

  console.log("\n━".repeat(60));
  console.log("  All triggers fired!");
  console.log("  The worker is now processing them in the background.");
  console.log("  Open the dashboard to watch verdicts appear live:");
  console.log("  → http://localhost:5173");
  console.log("━".repeat(60));
}

main();
