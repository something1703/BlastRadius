/**
 * Source Health Checker — BullMQ repeatable job
 *
 * Runs every 5 minutes. For each known data source, executes a lightweight
 * Coral probe query (SELECT 1 FROM <schema>.information_schema or similar)
 * and updates the `public.sources` table in Supabase with the result.
 *
 * This powers the live status dots on the Sources and Settings pages.
 */

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { Queue, Worker as BullWorker, type Job } from "bullmq";
import { createRedisConnection } from "./connection.js";
import { createCoralClient } from "../coral/client.js";
import { sb } from "../db/supabase.js";
import pino from "pino";

const log = pino({ name: "health-worker" });

const HEALTH_QUEUE = "source-health";

// The schema names Coral exposes per source
const SOURCE_PROBES: { name: string; schema: string; displayName: string }[] = [
  { name: "launchdarkly", schema: "launchdarkly", displayName: "LaunchDarkly" },
  { name: "sentry",       schema: "sentry",        displayName: "Sentry" },
  { name: "vercel",       schema: "vercel",        displayName: "Vercel" },
];

async function runHealthChecks() {
  log.info("→ running source health checks");
  let coral: Awaited<ReturnType<typeof createCoralClient>> | null = null;

  try {
    coral = await createCoralClient();
  } catch (err) {
    log.error({ err: (err as Error).message }, "failed to connect to Coral — all sources marked disconnected");
    // Mark all sources as disconnected if Coral itself won't start
    for (const src of SOURCE_PROBES) {
      await sb.from("sources").upsert(
        {
          name: src.name,
          display_name: src.displayName,
          status: "disconnected",
          last_checked_at: new Date().toISOString(),
          last_error: `Coral connection failed: ${(err as Error).message}`,
        },
        { onConflict: "name" }
      );
    }
    return;
  }

  for (const src of SOURCE_PROBES) {
    const now = new Date().toISOString();
    try {
      // Run a lightweight probe: list tables in the source schema
      const result = (await coral.callTool("list_tables", { schema: src.schema })) as {
        content?: { text?: string }[];
      };

      const hasContent = result?.content && result.content.length > 0;

      await sb.from("sources").upsert(
        {
          name: src.name,
          display_name: src.displayName,
          status: hasContent ? "healthy" : "degraded",
          last_checked_at: now,
          last_error: null,
        },
        { onConflict: "name" }
      );

      log.info({ source: src.name, status: hasContent ? "healthy" : "degraded" }, "health check OK");
    } catch (err) {
      const errMsg = (err as Error).message;
      log.warn({ source: src.name, err: errMsg }, "health check FAILED");

      await sb.from("sources").upsert(
        {
          name: src.name,
          display_name: src.displayName,
          status: "error",
          last_checked_at: now,
          last_error: errMsg.slice(0, 500),
        },
        { onConflict: "name" }
      );
    }
  }

  await coral.close();
  log.info("→ health checks complete");
}

export function startHealthWorker() {
  const redis = createRedisConnection();
  const healthQueue = new Queue(HEALTH_QUEUE, { connection: redis });

  // Schedule repeatable job: every 5 minutes
  healthQueue.add(
    "check-all-sources",
    {},
    {
      repeat: { every: 5 * 60 * 1000 }, // 5 minutes in ms
      jobId: "source-health-recurring",
    }
  ).then(() => {
    log.info("📅 Source health check scheduled every 5 minutes");
  }).catch((err: Error) => {
    log.error({ err: err.message }, "Failed to schedule health check job");
  });

  const worker = new BullWorker(
    HEALTH_QUEUE,
    async (_job: Job) => {
      await runHealthChecks();
    },
    {
      connection: redis,
      concurrency: 1,
    }
  );

  worker.on("completed", () => log.info("✓ health check job completed"));
  worker.on("failed", (_job, err) => log.error({ err: err.message }, "health check job failed"));

  log.info("🩺 Source health worker started");
  return worker;
}

// Allow running standalone for immediate one-off check: `tsx src/queue/health-worker.ts`
const isMain = import.meta.url === `file://${process.argv[1]!.replace(/\\/g, "/")}`;
if (isMain) {
  log.info("Running health check in standalone mode...");
  runHealthChecks().then(() => {
    log.info("Done. Exiting.");
    process.exit(0);
  }).catch((err) => {
    log.error(err);
    process.exit(1);
  });
}
