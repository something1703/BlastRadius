/**
 * seed-demos.ts — Enqueues 5 curated demo investigations through the REAL BullMQ queue.
 *
 * This script does NOT hardcode verdicts, bypass the agent, or insert directly into Supabase.
 * It enqueues real jobs that the worker picks up and runs the full Gemini → Coral pipeline.
 *
 * The trigger inputs are chosen to make each cause label likely, but the agent produces the
 * actual verdict based on what it finds in the real data sources.
 *
 * Prerequisites before running:
 *   1. Create these LaunchDarkly flags: feature-checkout-v2, feature-dark-mode,
 *      feature-new-pricing-modal, feature-experimental-search
 *   2. Flip feature-checkout-v2 ON/OFF and feature-dark-mode ON (creates audit log entries)
 *   3. Fire 3 distinct Sentry errors spaced 30min, 90min, 3h ago
 *   4. Push a Vercel deployment (any trivial commit to your connected repo)
 *   5. Wipe old data: DELETE FROM query_runs; DELETE FROM verdicts; DELETE FROM investigations;
 *
 * Usage:
 *   pnpm --filter worker run seed:demos
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { Queue } from "bullmq";
import { createRedisConnection, QUEUE_NAME } from "../queue/connection.js";

const redis = createRedisConnection();
const queue = new Queue(QUEUE_NAME, { connection: redis });

// ─── Tune these offsets to match when you actually flipped flags / deployed ──
// Each offset is in minutes BEFORE now. Pick times where real data exists.
//
// "flag"         → flag flip with Sentry errors appearing shortly after
// "deploy"       → Vercel deploy event, no flag flip nearby
// "both"         → flag flip AND a deploy in overlapping 2h windows
// "neither"      → flag flip but no correlated Sentry errors or deploys in window
// "inconclusive" → very old event, likely little data in window → agent says inconclusive

const scenarios = [
  {
    label_hint: "flag",           // Agent should find: flag flip → Sentry errors shortly after
    trigger_type: "flag_flip" as const,
    identifier: "feature-checkout-v2",
    occurred_at_offset_min: -40,  // 40 min ago — tune to when you flipped this flag
  },
  {
    label_hint: "deploy",         // Agent should find: Vercel deploy, no flag flip nearby
    trigger_type: "deploy" as const,
    identifier: "blast-radius",   // ← CHANGE THIS to your actual Vercel project name
    occurred_at_offset_min: -120, // 2h ago — tune to when you pushed the deploy commit
  },
  {
    label_hint: "both",           // Agent should find: flag flip AND deploy in same 2h window
    trigger_type: "flag_flip" as const,
    identifier: "feature-dark-mode",
    occurred_at_offset_min: -180, // 3h ago — tune so a deploy was also in this window
  },
  {
    label_hint: "neither",        // Agent should find: flag flip but no correlated errors/deploys
    trigger_type: "flag_flip" as const,
    identifier: "feature-new-pricing-modal",
    occurred_at_offset_min: -240, // 4h ago — a quiet time with no incidents
  },
  {
    label_hint: "inconclusive",   // Agent should find: very little data → says inconclusive
    trigger_type: "manual" as const,
    identifier: "feature-experimental-search",
    occurred_at_offset_min: -60 * 36, // 36h ago — sparse data, hard to correlate
  },
];

console.log("🌱 Seeding 5 demo investigations through the real BullMQ queue...\n");

for (const s of scenarios) {
  const occurred_at = new Date(
    Date.now() + s.occurred_at_offset_min * 60_000
  ).toISOString();

  await queue.add(
    "analyze",
    {
      trigger_type: s.trigger_type,
      identifier: s.identifier,
      occurred_at,
    },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 100 },
    }
  );

  console.log(`  ✓ [${s.label_hint.padEnd(12)}] ${s.identifier} @ ${occurred_at}`);

  // Stagger enqueue so the dashboard shows investigations appearing over time
  // (each one starts ~8s after the previous — enough for the first to be visible before the next)
  if (s !== scenarios[scenarios.length - 1]) {
    await new Promise((r) => setTimeout(r, 8_000));
  }
}

console.log("\n✅ All 5 jobs enqueued. The worker will pick them up in order.");
console.log("   Watch the dashboard at http://localhost:5173/dashboard");
console.log("   Verdicts should appear over the next 5–10 minutes.\n");

await queue.close();
await redis.quit();
