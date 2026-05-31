# Blast Radius

> **The on-call engineer's autopilot. Federated SQL across your entire SaaS stack, driven by an AI agent, returning causal verdicts in 60 seconds.**

When production breaks at 3am, you open five tabs — LaunchDarkly, Sentry, Vercel, your APM, Slack — and start mentally correlating timestamps to figure out what caused it. Blast Radius automates the entire investigation.

A webhook fires. A Gemini agent runs a discovery-first MCP loop. Coral federates a single SQL query across LaunchDarkly, Sentry, and Vercel. A confidence-scored verdict streams back to your dashboard via Supabase Realtime. Sixty seconds, one button click, one answer.

---

## Live

| | URL |
|---|---|
| **Dashboard** | https://blast-radius-mu.vercel.app |
| **API** | https://blast-radius-api-377323041120.us-central1.run.app |
| **Worker** | https://blast-radius-worker-377323041120.us-central1.run.app |
| **Repository** | https://github.com/something1703/BlastRadius |

### Try it without setup

1. Open the dashboard — you'll see investigations already populated.
2. Click **Run Demo Analysis** on the top right.
3. Watch a new row appear instantly via Supabase Realtime, then see the verdict slide in ~60 seconds.
4. Click into the investigation to read the **exact federated SQL** the agent wrote at runtime — every query, every row count, every source touched.

No accounts to connect. No setup. The button hits the real API, which enqueues a real job, which spawns Coral, which queries real LaunchDarkly and Sentry and Vercel, which returns a real verdict.

---

## How Coral powers this

Without Coral, this project is three separate REST clients, three pagination loops, three auth flows, and a thousand lines of JavaScript to join the results in memory. The agent would burn its entire context window on raw JSON before it could correlate anything.

With Coral, every data source is a SQL table and the JOIN happens locally inside DataFusion before the model sees a single row. We run **Coral as a sidecar** in the worker container and connect to it via **MCP over stdio** using `@modelcontextprotocol/sdk`. The agent is given five MCP tools — `list_catalog`, `list_columns`, `describe_table`, `sql`, and `feedback` — and follows a discovery-first workflow: catalog → columns → plan → query → verdict.

A representative query the agent writes at runtime:

```sql
SELECT
  ld.name        AS flag_name,
  ld.date        AS flag_flip_time,
  s.title        AS sentry_error,
  s.first_seen   AS error_first_seen,
  v.uid          AS deploy_id,
  v.created_at   AS deploy_time
FROM launchdarkly.audit_log ld
LEFT JOIN sentry.issues s
  ON s.first_seen > to_timestamp_millis(ld.date)
 AND s.first_seen < to_timestamp_millis(ld.date) + INTERVAL '30 minutes'
LEFT JOIN vercel.deployments v
  ON v.created_at BETWEEN ld.date - 1800000 AND ld.date + 1800000
WHERE ld.kind = 'flag'
  AND ld."from" = '<computed_epoch_ms>'
  AND ld."to"   = '<computed_epoch_ms>'
ORDER BY ld.date DESC;
```

That single query federates three completely different SaaS APIs, all auth and pagination handled by Coral below deck, executed in milliseconds. We also wrote a **custom Vercel source spec** (`sources/vercel.yaml`) using `HeaderAuth`, cursor pagination, and `format_timestamp: unix_ms` — without it, the agent can't tell "the flag caused this" apart from "the deploy caused this." That spec is submitted upstream as our Chart New Waters bounty entry.

---

## Architecture

```
LaunchDarkly / Vercel webhook
        │
        ▼
┌──────────────────┐
│ Hono API (Zod)   │  validates payload, returns 400 on garbage
│ Cloud Run        │
└─────────┬────────┘
          │ BullMQ
          ▼
┌──────────────────┐
│ Upstash Redis    │  durable queue, retries, exponential backoff
└─────────┬────────┘
          │
          ▼
┌──────────────────────────────────────┐
│ Worker (Cloud Run)                   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Gemini 2.5 Flash agent loop    │  │
│  └──────────────┬─────────────────┘  │
│                 │ MCP (stdio)        │
│                 ▼                    │
│  ┌────────────────────────────────┐  │
│  │ Coral CLI sidecar              │  │
│  │ (federates LD + Sentry +       │  │
│  │  Vercel via SQL)               │  │
│  └──────────────┬─────────────────┘  │
└─────────────────┼────────────────────┘
                  │ Zod-validated verdict
                  ▼
        ┌──────────────────────┐
        │ Supabase Postgres    │
        │ investigations       │
        │ verdicts             │
        │ query_runs           │
        │ + Storage snapshots  │
        └──────────┬───────────┘
                   │ Realtime (WAL → WebSocket)
                   ▼
        ┌──────────────────────┐
        │ React + Vite UI      │
        │ (Vercel)             │
        └──────────────────────┘
```

| Layer | Tech | Responsibility |
|---|---|---|
| Webhook ingestion | Hono + Zod | Validate webhooks before they cost anything |
| Job queue | BullMQ + Upstash Redis | Durable, retryable, observable jobs |
| Agent | Gemini 2.5 Flash over MCP | Multi-turn tool-using loop, discovery-first |
| Federation | Coral CLI as MCP sidecar | The entire read plane — SQL across all sources |
| Custom source | `sources/vercel.yaml` | Adds `vercel.deployments` as a first-class table |
| Verdict schema | Zod | Structured output validated before persistence |
| Persistence | Supabase Postgres + Storage | Reproducible runs — every SQL + result snapshot saved |
| Realtime | Supabase Realtime (WAL → WS) | Live dashboard updates, no polling |
| Health | BullMQ repeatable job | Probes every Coral source every 5 minutes |
| Observability | OpenTelemetry | Custom spans per analysis, exported to OTLP |
| Deploy | Docker multi-stage → Cloud Run + Vercel | Worker container provisions Coral sources from env at boot |

---

## Why this is hard to get right

Three details that took the most debugging and matter most for production:

**Schema discovery before any SQL.** The agent never writes `SELECT *` blindly. The system prompt enforces `list_catalog → list_columns` before any query, because LaunchDarkly's `audit_log` requires `from` and `to` as epoch-ms *strings* and uses `kind = 'flag'` (not `'featureFlag'`, as you'd guess) — both discovered the hard way and now permanently encoded.

**Pre-computed timestamps.** LLMs are unreliable at date arithmetic. We compute `occurred_at - 24h` and `occurred_at + 24h` as epoch ms in TypeScript and inject them as exact strings into the user message. This eliminated an entire class of empty-result bugs.

**Reproducibility as a first-class output.** Every SQL query the agent runs is inserted into `query_runs` with the literal SQL text, and the result is uploaded to Supabase Storage as JSON. Three weeks later, anyone can replay a verdict's exact evidence — point at the snapshot, re-run the query.

---

## Project structure

```
packages/
  api/      Hono webhook server (LaunchDarkly, Vercel, manual, demo triggers)
  worker/   BullMQ worker, Coral MCP client, Gemini agent loop, OTel, health checker
  web/      React + Vite dashboard with Supabase Realtime
sources/
  vercel.yaml   Custom Coral source spec for Vercel deployments
supabase/
  schema.sql    Tables, indexes, storage buckets, realtime publications
```

---

## Run locally

```bash
git clone https://github.com/something1703/BlastRadius
cd BlastRadius
pnpm install

cp .env.example .env
# Fill in:
#   GEMINI_API_KEY
#   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
#   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
#   LAUNCHDARKLY_API_TOKEN, LAUNCHDARKLY_PROJECT_KEY
#   SENTRY_AUTH_TOKEN, SENTRY_ORG_SLUG
#   VERCEL_API_TOKEN, VERCEL_TEAM_ID

# Apply the schema in the Supabase SQL editor (supabase/schema.sql)

pnpm --filter api dev      # API on :3001
pnpm --filter worker dev   # Background worker (spawns Coral CLI)
pnpm --filter web dev      # Dashboard on :5173

# Trigger a real analysis end to end
curl -X POST http://localhost:3001/triggers/manual \
  -H "Content-Type: application/json" \
  -d '{"trigger_type":"flag_flip","identifier":"checkout-v2","occurred_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

The worker container's entrypoint script (`packages/worker/entrypoint.sh`) provisions every Coral source from environment variables at boot — credentials never touch the source code or the image.

---

## Acknowledgements

Built for the **Pirates of the Coral-bean** hackathon. Coral is genuinely the right primitive for agentic data access — five days of working with it convinced us that federated SQL is the correct abstraction for AI agents touching multi-source data, and we'll build on it again.

Thanks to the WeMakeDevs team for organizing, and to the Coral team for the documentation, the bundled sources, and the source-spec system that made our Vercel integration a YAML file instead of a TypeScript SDK port.

---

🏴‍☠️