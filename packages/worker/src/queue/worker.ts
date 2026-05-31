// ── OpenTelemetry MUST be the very first import ──────────────────────────────
// It instruments fetch/HTTP calls made by modules imported after this line.
import "../telemetry.js";
import { getTracer } from "../telemetry.js";
import { SpanStatusCode } from "@opentelemetry/api";
import type { Span } from "@opentelemetry/api";
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

import { Worker, Job as BullJob } from "bullmq";
import { createRedisConnection, QUEUE_NAME } from "./connection.js";
import { createCoralClient } from "../coral/client.js";
import { runAnalysis } from "../agent/loop.js";
import type { Job, QueryRecord } from "../agent/loop.js";
import { postVerdict } from "../notify/slack.js";
import { sb } from "../db/supabase.js";
import { startHealthWorker } from "./health-worker.js";
import pino from "pino";

const log = pino({ name: "blast-radius-worker" });
const tracer = getTracer();

const redis = createRedisConnection();

const worker = new Worker<Job>(
  QUEUE_NAME,
  async (bullJob: BullJob<Job>) => {
    const jobData = bullJob.data;
    const startTime = Date.now();
    log.info({ jobId: bullJob.id, data: jobData }, "starting analysis");

    // ── OpenTelemetry span wrapping the full analysis ─────────────────────
    await tracer.startActiveSpan("blast-radius.analysis", async (span: Span) => {
      span.setAttributes({
        "analysis.trigger_type": jobData.trigger_type,
        "analysis.identifier":   jobData.identifier,
        "bull.job_id":           String(bullJob.id),
      });

      // ── Step 1: Insert investigation row (status = 'running') ──────────
      const { data: investigation, error: insertErr } = await sb
        .from("investigations")
        .insert({
          trigger_type: jobData.trigger_type,
          identifier:   jobData.identifier,
          occurred_at:  jobData.occurred_at,
          status:       "running",
          started_at:   new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr || !investigation) {
        span.recordException(insertErr ?? new Error("no investigation returned"));
        span.setStatus({ code: SpanStatusCode.ERROR, message: insertErr?.message });
        span.end();
        log.error({ error: insertErr }, "failed to insert investigation");
        throw new Error(`Supabase insert failed: ${insertErr?.message}`);
      }

      const investigationId = investigation.id;
      span.setAttribute("analysis.investigation_id", investigationId);
      log.info({ investigationId }, "investigation row created");

      const coral = await createCoralClient();
      let queryCount = 0;
      const sourcesUsed = new Set<string>();

      try {
        // ── Step 2: Run analysis with per-query callback ─────────────────
        const verdict = await runAnalysis(jobData, coral, {
          onQuery: async (record: QueryRecord) => {
            queryCount++;

            // Track which sources the SQL touches
            const sqlUpper = record.sql.toUpperCase();
            if (sqlUpper.includes("LAUNCHDARKLY")) sourcesUsed.add("launchdarkly");
            if (sqlUpper.includes("SENTRY"))       sourcesUsed.add("sentry");
            if (sqlUpper.includes("VERCEL"))       sourcesUsed.add("vercel");

            // Insert query_run row
            const { data: queryRow, error: qErr } = await sb
              .from("query_runs")
              .insert({
                investigation_id: investigationId,
                purpose:          record.purpose,
                sql:              record.sql,
                row_count:        record.row_count,
              })
              .select("id")
              .single();

            if (qErr) {
              log.warn({ error: qErr }, "failed to insert query_run");
              return;
            }

            // Upload result snapshot to Supabase Storage
            if (queryRow && record.result) {
              const storagePath = `${investigationId}/queries/${queryRow.id}.json`;
              const { error: uploadErr } = await sb.storage
                .from("investigations")
                .upload(storagePath, JSON.stringify(record.result, null, 2), {
                  contentType: "application/json",
                  upsert: true,
                });

              if (uploadErr) {
                log.warn({ error: uploadErr }, "failed to upload query result to storage");
              } else {
                await sb
                  .from("query_runs")
                  .update({ result_storage_key: storagePath })
                  .eq("id", queryRow.id);
              }
            }
          },
        });

        // ── Step 3: Set OTel span attributes with final metrics ──────────
        const durationMs = Date.now() - startTime;
        span.setAttributes({
          "analysis.duration_ms":    durationMs,
          "analysis.sql_query_count": queryCount,
          "analysis.sources_used":   Array.from(sourcesUsed).join(","),
          "analysis.cause_label":    verdict.cause.label,
          "analysis.confidence":     Math.round(verdict.cause.confidence * 100),
        });

        // ── Step 4: Insert verdict & mark investigation complete ──────────
        const { error: verdictErr } = await sb.from("verdicts").insert({
          investigation_id: investigationId,
          cause_label:      verdict.cause.label,
          cause_confidence: verdict.cause.confidence,
          cause_reasoning:  verdict.cause.reasoning,
          error_delta_pct:  verdict.impact.error_delta_pct,
          latency_delta_ms: verdict.impact.latency_delta_ms,
          users_affected:   verdict.impact.users_affected,
          cohorts:          verdict.impact.cohorts,
          sources_used:     verdict.evidence.sources_used,
          actions:          verdict.actions,
        });

        if (verdictErr) {
          throw new Error(`Supabase verdict insert failed: ${verdictErr.message}`);
        }

        await sb
          .from("investigations")
          .update({ status: "complete", completed_at: new Date().toISOString() })
          .eq("id", investigationId);

        log.info(
          { jobId: bullJob.id, investigationId, cause: verdict.cause.label, confidence: verdict.cause.confidence, durationMs, queryCount },
          "analysis complete — persisted to Supabase"
        );

        // Post to Slack
        await postVerdict(verdict);

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
        return verdict;
      } catch (err) {
        // ── Step 5: Mark investigation as failed ─────────────────────────
        await sb
          .from("investigations")
          .update({
            status:        "failed",
            error_message: (err as Error).message,
            completed_at:  new Date().toISOString(),
          })
          .eq("id", investigationId);

        span.recordException(err as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
        span.end();
        throw err;
      } finally {
        await coral.close();
      }
    });
  },
  {
    connection: redis,
    concurrency: 1,
  }
);

worker.on("completed", (job) => {
  log.info({ jobId: job?.id }, "job completed successfully");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err: err.message }, "job failed");
});

worker.on("error", (err) => {
  log.error({ err: err.message }, "worker error");
});

// Start the source health checker as a co-process
startHealthWorker();

// ── Cloud Run health server ───────────────────────────────────────────────────
// Cloud Run requires the container to listen on PORT within the startup timeout.
// The BullMQ worker itself doesn't serve HTTP, so we bind a minimal server here.
import http from "node:http";

const PORT = process.env.PORT ?? "8080";
const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, service: "blast-radius-worker", ts: new Date().toISOString() }));
});
healthServer.listen(PORT, () => {
  log.info(`Health server listening on :${PORT}`);
});
// ─────────────────────────────────────────────────────────────────────────────

log.info("🏴‍☠️ Blast Radius worker started, waiting for jobs...");
