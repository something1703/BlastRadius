import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { z } from "zod";

// Redis connection (same Upstash credentials as the worker)
const restUrl = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!restUrl || !token) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
}

const hostname = new URL(restUrl).hostname;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const redis = new (IORedis as any)({
  host: hostname,
  port: 6379,
  password: token,
  maxRetriesPerRequest: null,
  tls: {},
});

const queue = new Queue("blast-radius-analyses", { connection: redis });

const app = new Hono();

// CORS for frontend
app.use("/*", cors({ origin: "*" }));

// --- Webhook schemas ---

const LDFlagWebhook = z.object({
  kind: z.literal("flag"),
  name: z.string(),
  date: z.number(), // unix ms
});

const ManualTrigger = z.object({
  trigger_type: z.enum(["flag_flip", "deploy", "metric_spike", "manual"]),
  identifier: z.string(),
  occurred_at: z.string().optional(),
  hint: z.string().optional(),
});

const VercelDeployWebhook = z.object({
  type: z.string(),
  payload: z.object({
    deployment: z.object({
      name: z.string(),
      url: z.string(),
    }),
  }),
});

// --- Routes ---

// LaunchDarkly webhook: fires when a flag is flipped
app.post("/webhooks/launchdarkly", async (c) => {
  const body = await c.req.json();
  const parsed = LDFlagWebhook.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.flatten() }, 400);
  }

  const job = {
    trigger_type: "flag_flip" as const,
    identifier: parsed.data.name,
    occurred_at: new Date(parsed.data.date).toISOString(),
  };

  const enqueued = await queue.add("analyze", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });

  console.log(`📥 LaunchDarkly webhook → enqueued job ${enqueued.id}: ${job.identifier}`);
  return c.json({ enqueued: true, jobId: enqueued.id });
});

// Vercel webhook: fires on deploy
app.post("/webhooks/vercel", async (c) => {
  const body = await c.req.json();
  const parsed = VercelDeployWebhook.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload" }, 400);
  }

  const job = {
    trigger_type: "deploy" as const,
    identifier: parsed.data.payload.deployment.name,
    occurred_at: new Date().toISOString(),
  };

  const enqueued = await queue.add("analyze", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });

  console.log(`📥 Vercel webhook → enqueued job ${enqueued.id}: ${job.identifier}`);
  return c.json({ enqueued: true, jobId: enqueued.id });
});

// Manual trigger from the UI or CLI
app.post("/triggers/manual", async (c) => {
  const body = await c.req.json();
  const parsed = ManualTrigger.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "invalid payload", details: parsed.error.flatten() }, 400);
  }

  const job = {
    trigger_type: parsed.data.trigger_type,
    identifier: parsed.data.identifier,
    occurred_at: parsed.data.occurred_at ?? new Date().toISOString(),
    hint: parsed.data.hint,
  };

  const enqueued = await queue.add("analyze", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });

  console.log(`📥 Manual trigger → enqueued job ${enqueued.id}: ${job.identifier}`);
  return c.json({ enqueued: true, jobId: enqueued.id });
});

// Demo trigger — picks a random identifier from DEMO_IDENTIFIERS env var
// This calls the real pipeline — no mocking
const demoIds = (process.env.DEMO_IDENTIFIERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.post("/triggers/demo", async (c) => {
  if (demoIds.length === 0) {
    return c.json({ error: "DEMO_IDENTIFIERS env var is not configured" }, 500);
  }
  const identifier = demoIds[Math.floor(Math.random() * demoIds.length)];
  const job = {
    trigger_type: "flag_flip" as const,
    identifier,
    occurred_at: new Date().toISOString(),
    hint: `Demo analysis triggered from the dashboard for identifier: ${identifier}`,
  };
  const enqueued = await queue.add("analyze", job, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  });
  console.log(`📥 Demo trigger → enqueued job ${enqueued.id}: ${identifier}`);
  return c.json({ enqueued: true, identifier, job_id: enqueued.id });
});

// Health check
app.get("/health", (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

// --- Start ---

// Cloud Run sets PORT=8080. Local dev falls back to API_PORT or 3001.
const port = parseInt(process.env.PORT ?? process.env.API_PORT ?? "3001");
serve({ fetch: app.fetch, port });
console.log(`🏴‍☠️ Blast Radius API listening on http://localhost:${port}`);
