# Blast Radius

> **AI-powered incident analysis — know exactly what broke production in seconds.**

Blast Radius is an autonomous agent that correlates LaunchDarkly flag flips, Vercel deploys, and Sentry errors using **federated SQL across all three sources simultaneously** via the Coral MCP protocol. When an incident happens, it fires a webhook, the Gemini agent writes live cross-source JOIN queries, and the verdict streams back to your dashboard in real-time.

---

## Try the Live Demo

**Live Dashboard:** https://github.com/something1703/BlastRadius

> Judges: You do not need to connect your own accounts.

1. Open the dashboard — you'll see a live feed of investigations already running.
2. Click **"Simulate Webhook"** to get a ready-to-run `cURL` command.
3. Paste it into your terminal to fire a real LaunchDarkly or Vercel event at the live API.
4. Watch the new row appear instantly via Supabase Realtime, then see the Gemini verdict slide in ~60 seconds.
5. Click into any investigation to read the **exact federated SQL** the agent wrote — every query, every row count.

---

## How We Use Coral

Without Coral, you'd write three separate API clients, pull the data into memory, and join it in JavaScript. We skipped all of that.

We run **Coral as a sidecar** via stdio and connect our Gemini agent to it using the **Model Context Protocol (MCP)**. The agent doesn't call APIs — it writes cross-source SQL JOINs across LaunchDarkly, Sentry, and Vercel as if they were a single database.

```sql
-- Actual query the Gemini agent writes at runtime:
SELECT
  f.key                 AS flag,
  f.flipped_at          AS flip_time,
  e.title               AS error_title,
  e.first_seen,
  EXTRACT(EPOCH FROM (e.first_seen - f.flipped_at)) / 60 AS lag_minutes
FROM launchdarkly.flag_evaluations f
JOIN sentry.issues e
  ON e.first_seen BETWEEN f.flipped_at
                      AND f.flipped_at + INTERVAL '2 hours'
WHERE f.key = 'checkout-v2'
ORDER BY e.first_seen;
```

*This query spans two completely different SaaS APIs and pushes the join down to the Coral engine in milliseconds.*

---

## Architecture

```
Webhook (LaunchDarkly / Vercel)
        │
        ▼
  Hono API Server  ──(Zod validation)──▶  BullMQ Queue  (Upstash Redis)
                                                │
                                                ▼
                                     BullMQ Worker
                                        │
                                        ├── spawns Coral MCP client (stdio)
                                        │         │
                                        │         └── list_catalog → list_columns → execute_query
                                        │
                                        └── Gemini 2.5 Flash agent loop
                                                │
                                                ▼
                                       Zod-validated Verdict JSON
                                                │
                                         Supabase (Postgres)
                                                │
                                         Supabase Realtime
                                                │
                                        React / Vite Dashboard
```

**What we actually built (not just a script):**

| Layer | Technology | What it does |
|---|---|---|
| Ingestion | Hono + Zod | Validates webhooks from LD & Vercel |
| Queue | BullMQ + Upstash Redis | Resilient job queue with exponential backoff |
| Agent | Gemini 2.5 Flash (MCP) | Discovery-first: introspects schema before writing SQL |
| Federation | Coral MCP (stdio) | Federated SQL across LaunchDarkly, Sentry, Vercel |
| Storage | Supabase Postgres | Investigations, verdicts, query_runs tables |
| Realtime | Supabase Realtime | Live verdict streaming to the UI |
| Observability | OpenTelemetry | Spans + custom metrics (query count, duration, confidence) |
| Health | BullMQ repeatable job | Probes Coral sources every 5 minutes |
| Deploy | Docker + Cloud Run | Multi-stage builds, env-provisioned Coral sources |

---

## Project Structure

```
packages/
  api/      — Hono webhook server (LaunchDarkly, Vercel, manual trigger)
  worker/   — BullMQ worker, Coral MCP client, Gemini agent loop, OTel
  web/      — React/Vite dashboard with Supabase Realtime
supabase/   — SQL migrations
infra/      — Docker + Cloud Run config
```

---

## Local Setup

```bash
# 1. Clone & install
git clone https://github.com/something1703/BlastRadius
cd BlastRadius
pnpm install

# 2. Configure environment
cp .env.example .env
# Fill in: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
#          UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
#          GEMINI_API_KEY, LAUNCHDARKLY_API_TOKEN, LAUNCHDARKLY_PROJECT_KEY,
#          SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG, SENTRY_DSN, VERCEL_API_TOKEN

# 3. Run Supabase migrations (from supabase/ folder)

# 4. Start all services
pnpm --filter api dev        # API on :3001
pnpm --filter worker dev     # Background worker
pnpm --filter web dev        # Dashboard on :5173

# 5. Fire a test webhook
curl -X POST http://localhost:3001/webhooks/launchdarkly \
  -H "Content-Type: application/json" \
  -d '{"kind":"flag","name":"checkout-v2","date":'$(date +%s000)'}'
```

---

*Built for the Coral Hackathon 2026*
