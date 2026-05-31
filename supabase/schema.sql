-- Blast Radius — Supabase Schema
-- Run this in the Supabase SQL Editor (or via psql)

-- investigations: one row per triggered analysis (job)
create table public.investigations (
  id              uuid primary key default gen_random_uuid(),
  trigger_type    text not null check (trigger_type in ('flag_flip','deploy','metric_spike','manual')),
  identifier      text not null,
  occurred_at     timestamptz not null,
  enqueued_at     timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  status          text not null default 'pending' check (status in ('pending','running','complete','failed')),
  error_message   text
);
create index on public.investigations (occurred_at desc);
create index on public.investigations (status);

-- verdicts: one row per completed investigation
create table public.verdicts (
  id                  uuid primary key default gen_random_uuid(),
  investigation_id    uuid not null references public.investigations(id) on delete cascade,
  cause_label         text not null check (cause_label in ('flag','deploy','both','neither','inconclusive')),
  cause_confidence    numeric not null check (cause_confidence between 0 and 1),
  cause_reasoning     text not null,
  error_delta_pct     numeric,
  latency_delta_ms    numeric,
  users_affected      integer,
  cohorts             jsonb not null default '[]'::jsonb,
  sources_used        text[] not null default '{}'::text[],
  actions             jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);
create index on public.verdicts (investigation_id);
create index on public.verdicts (created_at desc);

-- query_runs: one row per SQL query the agent executed (for reproducibility)
create table public.query_runs (
  id                  uuid primary key default gen_random_uuid(),
  investigation_id    uuid not null references public.investigations(id) on delete cascade,
  purpose             text not null,
  sql                 text not null,
  row_count           integer not null,
  -- result snapshot stored in Storage at: investigations/{id}/queries/{id}.json
  result_storage_key  text,
  executed_at         timestamptz not null default now()
);
create index on public.query_runs (investigation_id);

-- sources: one row per Coral source connected, used for the Sources screen
create table public.sources (
  name           text primary key,           -- e.g. "launchdarkly"
  display_name   text not null,
  status         text not null check (status in ('healthy','degraded','error','disconnected')),
  last_checked_at timestamptz,
  last_error     text
);

-- Storage bucket for query result snapshots and SQL artifacts
insert into storage.buckets (id, name, public) values ('investigations', 'investigations', false)
on conflict do nothing;

-- Enable Realtime on the verdicts table so the dashboard gets live pushes
alter publication supabase_realtime add table public.verdicts;
alter publication supabase_realtime add table public.investigations;

-- Seed sources table with Phase 1 data
insert into public.sources (name, display_name, status, last_checked_at) values
  ('launchdarkly', 'LaunchDarkly', 'healthy', now()),
  ('sentry', 'Sentry', 'healthy', now()),
  ('vercel', 'Vercel', 'healthy', now())
on conflict (name) do nothing;
